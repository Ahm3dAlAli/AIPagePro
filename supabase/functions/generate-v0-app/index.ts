import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient as createSupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { createClient } from 'https://esm.sh/v0-sdk@0.14.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateRequest {
  campaignConfig: any;
  pageId: string;
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

    // Initialize v0 SDK client
    const v0 = createClient({ apiKey: V0_API_KEY });

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

    const { campaignConfig, pageId } = await req.json() as GenerateRequest;
    
    console.log('Step 1: Calling PRD generation function...');
    
    // Call the generate-prd-prompt function to get PRD and engineering prompt
    const prdResponse = await supabaseClient.functions.invoke('generate-prd-prompt', {
      body: { campaignConfig }
    });

    if (prdResponse.error) {
      console.error('PRD generation error:', prdResponse.error);
      throw new Error(`Failed to generate PRD: ${prdResponse.error.message}`);
    }

    const { prdDocument, engineeringPrompt } = prdResponse.data;
    
    if (!prdDocument || !engineeringPrompt) {
      throw new Error('PRD or engineering prompt not generated');
    }

    console.log('PRD generated successfully');
    console.log('Engineering prompt length:', engineeringPrompt?.length || 0);
    
    console.log('Step 2: Initializing v0 chat with context files...');
    
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

    // Background task: Send message and process results
    const backgroundTask = async () => {
      try {
        console.log('Background: Sending engineering prompt...');
        const messageResponse = await v0.chats.sendMessage({
          chatId: chat.id,
          message: engineeringPrompt,
        });

        console.log('Background: Message sent, files:', messageResponse.files?.length || 0);

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
          console.log('Background: Components saved successfully');
        }
      } catch (error) {
        console.error('Background task error:', error);
        if (pageId) {
          await supabaseClient
            .from('generated_pages')
            .update({
              content: {
                chatId: chat.id,
                demoUrl: chat.demo,
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
    EdgeRuntime.waitUntil(backgroundTask());

    // Return immediately with chat info
    return new Response(
      JSON.stringify({ 
        success: true,
        chatId: chat.id,
        demoUrl: chat.demo,
        status: 'generating',
        message: 'Generation started in background'
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
