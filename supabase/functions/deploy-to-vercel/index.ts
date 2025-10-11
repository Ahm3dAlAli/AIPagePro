import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VercelDeploymentConfig {
  name: string;
  files: {
    [path: string]: {
      file: string; // base64 encoded content
    };
  };
  projectSettings: {
    framework: string;
    buildCommand?: string;
    outputDirectory?: string;
  };
}

function generateDeploymentTrackingScript(pageId: string, supabaseUrl: string, supabaseAnonKey: string): string {
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

function generateNextJSFiles(pageData: any, pageHtml: string, prdDocument?: any): VercelDeploymentConfig {
  const pageName = pageData.slug || 'landing-page';
  
  // Generate package.json
  const packageJson = {
    "name": `pagepilot-${pageName}`,
    "version": "1.0.0",
    "private": true,
    "scripts": {
      "dev": "next dev",
      "build": "next build",
      "start": "next start",
      "lint": "next lint"
    },
    "dependencies": {
      "next": "14.0.0",
      "react": "18.2.0",
      "react-dom": "18.2.0"
    },
    "devDependencies": {
      "@types/node": "20.0.0",
      "@types/react": "18.2.0",
      "@types/react-dom": "18.2.0",
      "eslint": "8.0.0",
      "eslint-config-next": "14.0.0",
      "typescript": "5.0.0"
    }
  };

  // Generate next.config.js
  const nextConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  }
}

module.exports = nextConfig`;

  // Generate tracking script
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const trackingScript = generateDeploymentTrackingScript(pageData.id, supabaseUrl, supabaseAnonKey);
  
  // Generate main page component with analytics
  const indexPage = `import Head from 'next/head';
import { useEffect } from 'react';

export default function LandingPage() {
  useEffect(() => {
    ${trackingScript}
  }, []);

  return (
    <>
      <Head>
        <title>${pageData.title || 'Landing Page'}</title>
        <meta name="description" content="${pageData.content?.metaDescription || 'AI-generated landing page'}" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div dangerouslySetInnerHTML={{ __html: \`${pageHtml.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\` }} />
    </>
  );
}`;

  // Generate TypeScript config
  const tsConfig = {
    "compilerOptions": {
      "target": "es5",
      "lib": ["dom", "dom.iterable", "es6"],
      "allowJs": true,
      "skipLibCheck": true,
      "strict": true,
      "forceConsistentCasingInFileNames": true,
      "noEmit": true,
      "esModuleInterop": true,
      "module": "esnext",
      "moduleResolution": "bundler",
      "resolveJsonModule": true,
      "isolatedModules": true,
      "jsx": "preserve",
      "incremental": true,
      "plugins": [
        {
          "name": "next"
        }
      ],
      "paths": {
        "@/*": ["./*"]
      }
    },
    "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
    "exclude": ["node_modules"]
  };

  return {
    name: `pagepilot-${pageName}`,
    files: {
      "package.json": {
        file: btoa(JSON.stringify(packageJson, null, 2))
      },
      "next.config.js": {
        file: btoa(nextConfig)
      },
      "tsconfig.json": {
        file: btoa(JSON.stringify(tsConfig, null, 2))
      },
      "pages/index.tsx": {
        file: btoa(indexPage)
      },
      "public/favicon.ico": {
        file: btoa("") // Empty favicon for now
      },
      ".gitignore": {
        file: btoa(`# Dependencies
node_modules/
.pnp
.pnp.js

# Production
/build
/out

# Next.js
/.next/
/out/

# Environment variables
.env*.local

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*`)
      },
      ...(prdDocument ? {
        "docs/PRD.md": {
          file: btoa(typeof prdDocument === 'string' ? prdDocument : prdDocument?.content || JSON.stringify(prdDocument, null, 2))
        },
        "README.md": {
          file: btoa(`# ${pageData.title || 'Landing Page'}

This landing page was generated with AI-driven optimization.

## Documentation

See [docs/PRD.md](./docs/PRD.md) for the complete Product Requirements Document including:
- Big Picture & Strategy
- Data Models
- API Design
- UX/UI Specifications
- Technical Implementation

## Deployment

This project is deployed on Vercel.

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) to view the page.
`)
        }
      } : {})
    },
    projectSettings: {
      framework: "nextjs",
      buildCommand: "npm run build",
      outputDirectory: "out"
    }
  };
}

async function deployToVercel(deploymentConfig: VercelDeploymentConfig, vercelToken: string): Promise<any> {
  console.log('Deploying to Vercel:', deploymentConfig.name);

  try {
    // Create deployment using Vercel API
    const deploymentResponse = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: deploymentConfig.name,
        files: deploymentConfig.files,
        projectSettings: deploymentConfig.projectSettings,
        target: 'production'
      })
    });

    if (!deploymentResponse.ok) {
      const error = await deploymentResponse.text();
      throw new Error(`Vercel deployment failed: ${error}`);
    }

    const deployment = await deploymentResponse.json();
    
    // Poll for deployment completion
    let deploymentStatus = deployment;
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes max
    
    while (deploymentStatus.readyState !== 'READY' && deploymentStatus.readyState !== 'ERROR' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      
      const statusResponse = await fetch(`https://api.vercel.com/v13/deployments/${deployment.id}`, {
        headers: {
          'Authorization': `Bearer ${vercelToken}`
        }
      });
      
      if (statusResponse.ok) {
        deploymentStatus = await statusResponse.json();
      }
      attempts++;
    }

    if (deploymentStatus.readyState === 'ERROR') {
      throw new Error('Deployment failed during build process');
    }

    return {
      id: deployment.id,
      url: deployment.url || `https://${deployment.name}.vercel.app`,
      status: deploymentStatus.readyState || 'READY',
      createdAt: deployment.createdAt,
      meta: {
        framework: deploymentConfig.projectSettings.framework,
        filesUploaded: Object.keys(deploymentConfig.files).length,
        buildTime: deploymentStatus.meta?.buildingAt ? 
          new Date(deploymentStatus.ready || Date.now()).getTime() - new Date(deploymentStatus.meta.buildingAt).getTime() : 
          null
      }
    };

  } catch (error) {
    console.error('Vercel deployment error:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    console.log('Auth check:', { hasUser: !!user, authError: authError?.message });
    
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      throw new Error(`Authentication failed: ${authError?.message || 'No user found'}`);
    }

    const { pageId, customDomain } = await req.json();

    if (!pageId) {
      throw new Error('Page ID is required');
    }

    // Get Vercel token from environment
    const vercelToken = Deno.env.get('VERCEL_API_TOKEN');
    if (!vercelToken) {
      throw new Error('Vercel API token not configured. Please add VERCEL_API_TOKEN to your Supabase secrets.');
    }

    console.log('Deploying page to Vercel:', pageId);

    // Get page data
    const { data: pageData, error: pageError } = await supabaseClient
      .from('generated_pages')
      .select('*')
      .eq('id', pageId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (pageError) {
      console.error('Error loading page:', pageError);
      throw new Error('Failed to load page data');
    }

    if (!pageData) {
      throw new Error('Page not found');
    }

    // Get rendered HTML from render-page function
    const renderResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/render-page/${pageId}`, {
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
      }
    });

    if (!renderResponse.ok) {
      throw new Error('Failed to render page HTML');
    }

    const pageHtml = await renderResponse.text();

    // Extract PRD document from page content if available
    const prdDocument = pageData.content?.prdDocument || pageData.content?.chatId ? 
      pageData.content : null;

    // Generate deployment files with PRD documentation
    const deploymentConfig = generateNextJSFiles(pageData, pageHtml, prdDocument);

    // Deploy to Vercel
    const deploymentResult = await deployToVercel(deploymentConfig, vercelToken);

    // Save deployment record
    const { data: deploymentRecord, error: deploymentError } = await supabaseClient
      .from('deployment_records')
      .insert({
        page_id: pageId,
        user_id: user.id,
        deployment_platform: 'vercel',
        deployment_status: 'success',
        deployment_url: deploymentResult.url,
        deployed_at: new Date().toISOString(),
        deployment_config: {
          vercelDeploymentId: deploymentResult.id,
          framework: 'nextjs',
          customDomain: customDomain || null
        }
      })
      .select()
      .single();

    if (deploymentError) {
      console.error('Error saving deployment record:', deploymentError);
    }

    // Update page with published URL
    const { error: updateError } = await supabaseClient
      .from('generated_pages')
      .update({ 
        published_url: deploymentResult.url,
        status: 'published'
      })
      .eq('id', pageId);

    if (updateError) {
      console.error('Error updating page:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        deployment: deploymentResult,
        deploymentRecord: deploymentRecord,
        previewUrl: deploymentResult.url
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in deploy-to-vercel function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});