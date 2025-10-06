import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient as createSupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { createClient } from 'npm:v0-sdk@0.14.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateRequest {
  engineeringPrompt: string;
  prdDocument: any;
  campaignConfig: any;
  pageId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting v0 app generation');
    
    const V0_API_KEY = Deno.env.get('V0_API_KEY');
    if (!V0_API_KEY) {
      throw new Error('V0_API_KEY is not configured');
    }

    console.log('Using v0 API key:', V0_API_KEY ? 'configured' : 'missing');

    const supabaseClient = createSupabaseClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const userClient = createSupabaseClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { 
          global: { 
            headers: { 
              Authorization: authHeader 
            } 
          }
        }
      );
      
      const { data: { user } } = await userClient.auth.getUser();
      userId = user?.id || '00000000-0000-0000-0000-000000000000';
    } else {
      userId = '00000000-0000-0000-0000-000000000000';
    }

    const { engineeringPrompt, prdDocument, campaignConfig, pageId } = await req.json() as GenerateRequest;
    
    if (!engineeringPrompt) {
      throw new Error('Engineering prompt is required');
    }

    console.log('Received engineering prompt, length:', engineeringPrompt?.length || 0);
    console.log('Page ID:', pageId || 'none');
    
    console.log('Step 2: Initializing v0 chat with context files...');
    
    // Create v0 client
    const v0 = createClient({ apiKey: V0_API_KEY });
    
    // Initialize chat with PRD and campaign config as context files (fast, no AI processing)
    const prdContent = typeof prdDocument === 'string' 
      ? prdDocument 
      : prdDocument?.content || JSON.stringify(prdDocument, null, 2);
    const campaignContent = JSON.stringify(campaignConfig, null, 2);
    
    const chat = await v0.chats.init({
      type: 'files',
      files: [
        {
          name: 'PRD.md',
          content: prdContent,
          locked: true,
        },
        {
          name: 'campaign-config.json',
          content: campaignContent,
          locked: true,
        },
      ],
      name: `Landing Page - ${new Date().toISOString()}`,
    });

    console.log('Chat initialized:', chat.id);
    console.log('Chat demo URL:', chat.demo);

    // Save initial chat info immediately
    if (pageId) {
      await supabaseClient
        .from('generated_pages')
        .update({
          content: {
            chatId: chat.id,
            demoUrl: chat.demo,
            prdDocument,
            campaignConfig,
            generatedWith: 'v0-api',
            status: 'generating',
            timestamp: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', pageId);
    }

    // Start v0 generation in background - return immediately to avoid timeout
    console.log('Starting v0 generation in background...');
    
    const backgroundGeneration = async () => {
      try {
        console.log('Sending engineering prompt to v0...');
        
        const messageResponse = await v0.chats.sendMessage({
          chatId: chat.id,
          message: engineeringPrompt,
        });

        console.log('v0 generation complete!');
        console.log('Files generated:', messageResponse.files?.length || 0);
        
        // Log file details for debugging
        if (messageResponse.files) {
          messageResponse.files.forEach((file: any, idx: number) => {
            console.log(`File ${idx + 1}: ${file.name} (${file.language || 'unknown'})`);
          });
        }

        // Inject analytics and A/B test tracking into generated files
        const trackingScript = generateTrackingScript(pageId);
        const enhancedFiles = injectTracking(messageResponse.files || [], trackingScript, pageId);
        messageResponse.files = enhancedFiles;

        const components = extractComponents(messageResponse);
        
        if (pageId) {
          await saveV0Components(supabaseClient, userId, pageId, {
            chatId: chat.id,
            demoUrl: chat.demo,
            components,
            files: messageResponse.files,
            prdDocument,
            campaignConfig
          });
          console.log('Components saved successfully');

          // Now fetch all files from v0 and store them properly
          console.log('Fetching all files from v0 chat...');
          try {
            const fetchResult = await supabaseClient.functions.invoke('fetch-v0-files', {
              body: { 
                pageId: pageId,
                chatId: chat.id 
              }
            });

            if (fetchResult.error) {
              console.error('Error fetching v0 files:', fetchResult.error);
            } else {
              console.log('Successfully fetched and stored files:', fetchResult.data);
            }
          } catch (fetchError) {
            console.error('Failed to invoke fetch-v0-files:', fetchError);
          }
        }
      } catch (error) {
        console.error('Background v0 generation error:', error);
        
        // Save error state
        if (pageId) {
          await supabaseClient
            .from('generated_pages')
            .update({
              content: {
                chatId: chat.id,
                demoUrl: chat.demo,
                prdDocument,
                campaignConfig,
                error: error instanceof Error ? error.message : 'Generation failed',
                status: 'error',
                timestamp: new Date().toISOString()
              }
            })
            .eq('id', pageId);
        }
      }
    };

    // Start background task
    EdgeRuntime.waitUntil(backgroundGeneration());

    // Return immediately with chat info
    return new Response(
      JSON.stringify({ 
        success: true,
        chatId: chat.id,
        demoUrl: chat.demo,
        status: 'generating',
        message: 'Generation started - will complete in background'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error generating v0 app:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function extractComponents(v0Data: any) {
  try {
    if (!v0Data.files || !Array.isArray(v0Data.files)) {
      return {
        mainComponent: null,
        components: [],
        styles: [],
        utilities: []
      };
    }

    const mainComponent = v0Data.files.find((f: any) => 
      f.name?.toLowerCase().includes('page') || 
      f.name?.toLowerCase().includes('landing') ||
      f.name?.toLowerCase().includes('app') ||
      f.name?.toLowerCase().includes('index')
    );

    const components = v0Data.files.filter((f: any) => 
      f.name?.toLowerCase().includes('component') ||
      f.type === 'component' ||
      (f.name?.endsWith('.tsx') && !f.name?.includes('page'))
    );

    const styles = v0Data.files.filter((f: any) => 
      f.name?.endsWith('.css') || f.name?.endsWith('.scss')
    );

    const utilities = v0Data.files.filter((f: any) => 
      f.name?.includes('util') || 
      f.name?.includes('helper') ||
      f.name?.includes('lib')
    );

    return {
      mainComponent,
      components,
      styles,
      utilities,
      allFiles: v0Data.files
    };
  } catch (error) {
    console.error('Error extracting components:', error);
    return {
      mainComponent: null,
      components: [],
      styles: [],
      utilities: [],
      error: error.message
    };
  }
}

async function saveV0Components(
  supabaseClient: any,
  userId: string,
  pageId: string,
  v0Result: any
) {
  try {
    // Update the generated_pages table with v0 data
    const { error: updateError } = await supabaseClient
      .from('generated_pages')
      .update({
        content: {
          ...v0Result,
          generatedWith: 'v0-api',
          status: 'completed',
          timestamp: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', pageId);

    if (updateError) {
      console.error('Error updating page with v0 data:', updateError);
      throw updateError;
    }

    // Create component exports for each v0 component
    if (v0Result.components?.allFiles) {
      for (const file of v0Result.components.allFiles) {
        if (file.name?.endsWith('.tsx') || file.name?.endsWith('.jsx')) {
          await supabaseClient
            .from('component_exports')
            .insert({
              user_id: userId,
              page_id: pageId,
              component_name: file.name?.replace(/\.(tsx|jsx)$/, '') || 'component',
              component_type: file.name?.includes('page') ? 'page' : 'component',
              react_code: file.content || '',
              export_format: 'react_tsx',
              json_schema: {
                fileName: file.name,
                type: file.type,
                generatedBy: 'v0-api'
              },
              sitecore_manifest: {}
            });
        }
      }
    }

    console.log('v0 components saved successfully');
  } catch (error) {
    console.error('Error saving v0 components:', error);
    throw error;
  }
}

function generateTrackingScript(pageId: string): string {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  
  return `
// Analytics & A/B Testing Tracking
const SUPABASE_URL = '${supabaseUrl}';
const SUPABASE_ANON_KEY = '${supabaseAnonKey}';
const PAGE_ID = '${pageId}';

const getOrCreateId = (key, expiry) => {
  if (typeof window === 'undefined') return null;
  let id = localStorage.getItem(key);
  if (!id) {
    id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    localStorage.setItem(key, id);
    if (expiry) localStorage.setItem(key + '_exp', String(Date.now() + expiry));
  }
  return id;
};

const visitorId = getOrCreateId('visitor_id', 365 * 24 * 60 * 60 * 1000);
const sessionId = getOrCreateId('session_id', 30 * 60 * 1000);

const urlParams = new URLSearchParams(window.location.search);
const utmSource = urlParams.get('utm_source');
const utmMedium = urlParams.get('utm_medium');
const utmCampaign = urlParams.get('utm_campaign');
const variant = urlParams.get('variant') || 'control';

const trackEvent = async (eventType, eventData = {}) => {
  try {
    await fetch(\`\${SUPABASE_URL}/functions/v1/analytics-tracker\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        pageId: PAGE_ID,
        eventType,
        eventData,
        visitorId,
        sessionId,
        metadata: {
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
          variant,
          userAgent: navigator.userAgent,
          referrer: document.referrer,
          url: window.location.href
        }
      })
    });
  } catch (error) {
    console.error('Analytics error:', error);
  }
};

// Track page view
const pageLoadTime = Date.now();
trackEvent('page_view', { url: window.location.href });

// Track time on page
let activeTime = 0;
let isActive = true;
const interval = setInterval(() => {
  if (isActive) activeTime += 1;
}, 1000);

document.addEventListener('visibilitychange', () => {
  isActive = !document.hidden;
});

window.addEventListener('beforeunload', () => {
  clearInterval(interval);
  trackEvent('page_view', { 
    timeOnPage: activeTime,
    scrollDepth: Math.max(window.scrollY / (document.body.scrollHeight - window.innerHeight) * 100, 0)
  });
});

// Track CTA clicks
document.addEventListener('click', (e) => {
  const target = e.target;
  if (target.tagName === 'BUTTON' || target.tagName === 'A') {
    const text = target.textContent?.trim() || '';
    const isCTA = text.toLowerCase().includes('get started') || 
                  text.toLowerCase().includes('sign up') ||
                  text.toLowerCase().includes('try') ||
                  text.toLowerCase().includes('buy') ||
                  text.toLowerCase().includes('subscribe');
    
    if (isCTA) {
      trackEvent('cta_click', { ctaText: text });
    }
  }
});

// Track forms
setTimeout(() => {
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    let formViewed = false;
    let formStarted = false;
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !formViewed) {
          formViewed = true;
          trackEvent('form_view', { formId: form.id || 'unnamed' });
        }
      });
    });
    observer.observe(form);
    
    form.addEventListener('input', () => {
      if (!formStarted) {
        formStarted = true;
        trackEvent('form_start', { formId: form.id || 'unnamed' });
      }
    }, { once: true });
    
    form.addEventListener('submit', () => {
      trackEvent('form_complete', { 
        formId: form.id || 'unnamed',
        timeToComplete: Date.now() - pageLoadTime
      });
    });
  });
}, 1000);

// Track bounce
setTimeout(() => {
  if (activeTime < 5) {
    trackEvent('bounce');
  }
}, 5000);
`;
}

function injectTracking(files: any[], trackingScript: string, pageId: string): any[] {
  return files.map(file => {
    const fileName = file.name || '';
    const content = file.content || '';
    
    // Inject tracking into main app/page files
    if (fileName.includes('app.tsx') || fileName.includes('page.tsx') || 
        fileName.includes('index.tsx') || fileName === 'App.tsx') {
      
      // Add tracking hook to the component
      const trackingHook = `
useEffect(() => {
${trackingScript}
}, []);
`;
      
      let enhancedContent = content;
      
      // Check if React is imported, if not add it
      if (!content.includes("from 'react'") && !content.includes('from "react"')) {
        enhancedContent = "import React, { useEffect } from 'react';\n" + content;
      } else if (!content.includes('useEffect')) {
        enhancedContent = content.replace(
          /from ['"]react['"]/,
          "from 'react'\nimport { useEffect } from 'react'"
        );
      }
      
      // Find the main component function and inject tracking
      const componentMatch = content.match(/export default function (\w+)|function (\w+)\(\)/);
      if (componentMatch) {
        const funcName = componentMatch[1] || componentMatch[2];
        const funcPattern = new RegExp(`(function ${funcName}\\([^)]*\\)\\s*{)`, 'g');
        enhancedContent = enhancedContent.replace(funcPattern, `$1${trackingHook}`);
      }
      
      return {
        ...file,
        content: enhancedContent
      };
    }
    
    return file;
  });
}
