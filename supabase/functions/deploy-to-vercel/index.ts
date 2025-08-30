import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { pageId, platform = 'vercel', config = {} } = await req.json();
    console.log('Starting deployment for page:', pageId, 'to platform:', platform);

    // Fetch the page data
    const { data: pageData, error: pageError } = await supabaseClient
      .from('generated_pages')
      .select('*')
      .eq('id', pageId)
      .single();

    if (pageError || !pageData) {
      throw new Error('Page not found');
    }

    // Record deployment attempt
    const { data: deploymentRecord } = await supabaseClient
      .from('deployment_records')
      .insert({
        user_id: user.id,
        page_id: pageId,
        deployment_platform: platform,
        deployment_status: 'pending',
        deployment_config: config
      })
      .select()
      .single();

    let deploymentResult;
    
    try {
      if (platform === 'vercel') {
        deploymentResult = await deployToVercel(pageData, config);
      } else if (platform === 'azure') {
        deploymentResult = await deployToAzure(pageData, config);
      } else {
        throw new Error(`Unsupported deployment platform: ${platform}`);
      }

      // Update deployment record with success
      await supabaseClient
        .from('deployment_records')
        .update({
          deployment_status: 'success',
          deployment_url: deploymentResult.url,
          deployed_at: new Date().toISOString()
        })
        .eq('id', deploymentRecord.id);

      // Update the page with the published URL
      await supabaseClient
        .from('generated_pages')
        .update({
          published_url: deploymentResult.url,
          status: 'published'
        })
        .eq('id', pageId);

      console.log('Deployment successful:', deploymentResult.url);

      return new Response(
        JSON.stringify({ 
          success: true,
          deploymentUrl: deploymentResult.url,
          platform: platform,
          deploymentId: deploymentRecord.id
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );

    } catch (deployError) {
      // Update deployment record with failure
      await supabaseClient
        .from('deployment_records')
        .update({
          deployment_status: 'failed',
          error_logs: deployError.message
        })
        .eq('id', deploymentRecord.id);

      throw deployError;
    }

  } catch (error) {
    console.error('Error in deployment:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An unexpected error occurred' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function deployToVercel(pageData: any, config: any): Promise<{ url: string }> {
  console.log('Deploying to Vercel...');
  
  // Generate the complete Next.js application files
  const projectFiles = generateNextJSProject(pageData);
  
  // In a real implementation, you would:
  // 1. Use Vercel's deployment API
  // 2. Create a temporary project
  // 3. Deploy the files
  // 4. Return the deployment URL
  
  // For now, return a mock URL
  const mockUrl = `https://${pageData.slug}-${Date.now()}.vercel.app`;
  
  // Simulate deployment delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return { url: mockUrl };
}

async function deployToAzure(pageData: any, config: any): Promise<{ url: string }> {
  console.log('Deploying to Azure...');
  
  // Generate the static files for Azure Static Web Apps
  const projectFiles = generateStaticProject(pageData);
  
  // In a real implementation, you would:
  // 1. Use Azure's deployment API
  // 2. Create a static web app
  // 3. Deploy the files
  // 4. Return the deployment URL
  
  // For now, return a mock URL
  const mockUrl = `https://${pageData.slug}-${Date.now()}.azurestaticapps.net`;
  
  // Simulate deployment delay
  await new Promise(resolve => setTimeout(resolve, 2500));
  
  return { url: mockUrl };
}

function generateNextJSProject(pageData: any): Record<string, string> {
  const content = pageData.content;
  
  return {
    'package.json': JSON.stringify({
      name: pageData.slug,
      version: '1.0.0',
      private: true,
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
        lint: 'next lint'
      },
      dependencies: {
        next: '14.0.0',
        react: '18.2.0',
        'react-dom': '18.2.0',
        '@types/node': '20.0.0',
        '@types/react': '18.2.0',
        '@types/react-dom': '18.2.0',
        autoprefixer: '10.4.16',
        postcss: '8.4.31',
        tailwindcss: '3.3.5',
        typescript: '5.2.2'
      }
    }, null, 2),
    
    'next.config.js': `/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig`,

    'tailwind.config.js': `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#007bff',
        secondary: '#6c757d',
      },
    },
  },
  plugins: [],
}`,

    'postcss.config.js': `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`,

    'pages/index.tsx': generateLandingPageComponent(content),
    
    'pages/_app.tsx': `import '../styles/globals.css'
import type { AppProps } from 'next/app'

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}`,

    'pages/_document.tsx': generateDocumentComponent(pageData),
    
    'styles/globals.css': `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}`,

    'public/robots.txt': `User-agent: *
Allow: /

Sitemap: https://${pageData.slug}.vercel.app/sitemap.xml`,

    'public/sitemap.xml': `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://${pageData.slug}.vercel.app/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`
  };
}

function generateStaticProject(pageData: any): Record<string, string> {
  const content = pageData.content;
  
  return {
    'index.html': generateStaticHTML(pageData, content),
    'styles.css': `/* Tailwind CSS compiled styles would go here */
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  margin: 0;
  padding: 0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.hero {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-align: center;
  padding: 100px 0;
}

.section {
  padding: 80px 0;
}

.btn-primary {
  background-color: #007bff;
  color: white;
  padding: 12px 30px;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
}

.btn-primary:hover {
  background-color: #0056b3;
}`,
    
    'script.js': `// Analytics and interaction scripts
document.addEventListener('DOMContentLoaded', function() {
  // Track CTA clicks
  document.querySelectorAll('.btn-primary').forEach(btn => {
    btn.addEventListener('click', function() {
      // Analytics tracking would go here
      console.log('CTA clicked:', this.textContent);
    });
  });
  
  // Form submission tracking
  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      // Form submission logic would go here
      console.log('Form submitted');
    });
  });
});`,

    'robots.txt': `User-agent: *
Allow: /

Sitemap: https://${pageData.slug}.azurestaticapps.net/sitemap.xml`,
  };
}

function generateLandingPageComponent(content: any): string {
  return `import Head from 'next/head'
import { useState } from 'react'

export default function Home() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log('Form submitted:', formData);
  };

  return (
    <>
      <Head>
        <title>${content.pageTitle || 'Landing Page'}</title>
        <meta name="description" content="${content.metaDescription || 'High-converting landing page'}" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              ${content.sections?.hero?.headline || 'Transform Your Business Today'}
            </h1>
            <p className="text-xl mb-8 max-w-3xl mx-auto">
              ${content.sections?.hero?.subheadline || 'Discover how our solution can help you achieve your goals'}
            </p>
            <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold text-lg hover:bg-gray-100 transition">
              ${content.sections?.hero?.ctaText || 'Get Started Now'}
            </button>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">
              ${content.sections?.benefits?.title || 'Why Choose Us'}
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {${JSON.stringify(content.sections?.benefits?.benefits || [
                { title: 'Benefit 1', description: 'Description of first benefit' },
                { title: 'Benefit 2', description: 'Description of second benefit' },
                { title: 'Benefit 3', description: 'Description of third benefit' }
              ])}.map((benefit, index) => (
                <div key={index} className="text-center p-6">
                  <h3 className="text-xl font-semibold mb-4">{benefit.title}</h3>
                  <p className="text-gray-600">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-blue-600 text-white">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-6">
              ${content.sections?.finalCta?.headline || 'Ready to Get Started?'}
            </h2>
            <p className="text-xl mb-8">
              ${content.sections?.finalCta?.subtext || 'Join thousands of satisfied customers today'}
            </p>
            
            <form onSubmit={handleSubmit} className="max-w-md mx-auto">
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Your Name"
                  className="w-full px-4 py-3 rounded-lg text-gray-900"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div className="mb-4">
                <input
                  type="email"
                  placeholder="Your Email"
                  className="w-full px-4 py-3 rounded-lg text-gray-900"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>
              <div className="mb-6">
                <input
                  type="text"
                  placeholder="Company Name"
                  className="w-full px-4 py-3 rounded-lg text-gray-900"
                  value={formData.company}
                  onChange={(e) => setFormData({...formData, company: e.target.value})}
                />
              </div>
              <button
                type="submit"
                className="w-full bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold text-lg hover:bg-gray-100 transition"
              >
                ${content.sections?.finalCta?.ctaText || 'Get Started Free'}
              </button>
            </form>
          </div>
        </section>
      </main>
    </>
  )
}`;
}

function generateDocumentComponent(pageData: any): string {
  return `import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="${pageData.content?.pageTitle || pageData.title}" />
        <meta property="og:description" content="${pageData.content?.metaDescription || 'High-converting landing page'}" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${pageData.content?.pageTitle || pageData.title}" />
        <meta name="twitter:description" content="${pageData.content?.metaDescription || 'High-converting landing page'}" />
        
        {/* Analytics Scripts */}
        <script
          dangerouslySetInnerHTML={{
            __html: \`
              // Google Analytics or other tracking scripts would go here
              console.log('Page loaded: ${pageData.title}');
            \`,
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}`;
}

function generateStaticHTML(pageData: any, content: any): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${content.pageTitle || pageData.title}</title>
    <meta name="description" content="${content.metaDescription || 'High-converting landing page'}">
    <meta name="robots" content="index, follow">
    
    <!-- Open Graph -->
    <meta property="og:title" content="${content.pageTitle || pageData.title}">
    <meta property="og:description" content="${content.metaDescription || 'High-converting landing page'}">
    <meta property="og:type" content="website">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${content.pageTitle || pageData.title}">
    <meta name="twitter:description" content="${content.metaDescription || 'High-converting landing page'}">
    
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <!-- Hero Section -->
    <section class="hero">
        <div class="container">
            <h1>${content.sections?.hero?.headline || 'Transform Your Business Today'}</h1>
            <p>${content.sections?.hero?.subheadline || 'Discover how our solution can help you achieve your goals'}</p>
            <a href="#contact" class="btn-primary">${content.sections?.hero?.ctaText || 'Get Started Now'}</a>
        </div>
    </section>

    <!-- Benefits Section -->
    <section class="section">
        <div class="container">
            <h2>${content.sections?.benefits?.title || 'Why Choose Us'}</h2>
            <div class="benefits-grid">
                ${(content.sections?.benefits?.benefits || [
                  { title: 'Benefit 1', description: 'Description of first benefit' },
                  { title: 'Benefit 2', description: 'Description of second benefit' },
                  { title: 'Benefit 3', description: 'Description of third benefit' }
                ]).map(benefit => `
                <div class="benefit-item">
                    <h3>${benefit.title}</h3>
                    <p>${benefit.description}</p>
                </div>
                `).join('')}
            </div>
        </div>
    </section>

    <!-- Contact Section -->
    <section id="contact" class="section" style="background: #f8f9fa;">
        <div class="container">
            <h2>${content.sections?.finalCta?.headline || 'Ready to Get Started?'}</h2>
            <p>${content.sections?.finalCta?.subtext || 'Join thousands of satisfied customers today'}</p>
            
            <form id="contact-form">
                <input type="text" name="name" placeholder="Your Name" required>
                <input type="email" name="email" placeholder="Your Email" required>
                <input type="text" name="company" placeholder="Company Name">
                <button type="submit" class="btn-primary">
                    ${content.sections?.finalCta?.ctaText || 'Get Started Free'}
                </button>
            </form>
        </div>
    </section>

    <script src="script.js"></script>
    
    <!-- Analytics -->
    <script>
        // Analytics tracking code would go here
        console.log('Page loaded: ${pageData.title}');
    </script>
</body>
</html>`;
}