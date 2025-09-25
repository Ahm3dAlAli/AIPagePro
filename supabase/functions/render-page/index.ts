import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateHTML(pageData: any): string {
  const { content } = pageData;
  const { sections } = content;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${content.pageTitle || 'Landing Page'}</title>
    <meta name="description" content="${content.metaDescription || ''}">
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: '#2563eb',
                        secondary: '#64748b',
                    }
                }
            }
        }
    </script>
    <style>
        .gradient-blue { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .gradient-purple { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
        .gradient-primary { background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); }
    </style>
</head>
<body class="font-sans">
    ${sections.hero ? renderHeroSection(sections.hero) : ''}
    ${sections.benefits ? renderBenefitsSection(sections.benefits) : ''}
    ${sections.features ? renderFeaturesSection(sections.features) : ''}
    ${sections.testimonials ? renderTestimonialsSection(sections.testimonials) : ''}
    ${sections.pricing ? renderPricingSection(sections.pricing) : ''}
    ${sections.faq ? renderFaqSection(sections.faq) : ''}
    ${sections.finalCta ? renderFinalCtaSection(sections.finalCta) : ''}
    
    <footer class="bg-gray-900 text-white py-8">
        <div class="max-w-4xl mx-auto px-6 text-center">
            <p>&copy; 2024 Generated with Lovable. All rights reserved.</p>
        </div>
    </footer>
</body>
</html>`;
}

function renderHeroSection(hero: any): string {
  const backgroundClass = hero.backgroundStyle === 'gradient-blue' ? 'gradient-blue' :
                         hero.backgroundStyle === 'gradient-purple' ? 'gradient-purple' :
                         hero.backgroundStyle === 'gradient-primary' ? 'gradient-primary' :
                         'bg-gray-900';

  return `
    <section class="${backgroundClass} text-white py-20">
        <div class="max-w-4xl mx-auto px-6 text-center">
            <h1 class="text-5xl font-bold mb-6">${hero.headline}</h1>
            <p class="text-xl mb-8 opacity-90">${hero.subheadline}</p>
            <div class="space-x-4">
                <button class="bg-white text-gray-900 px-8 py-3 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors">
                    ${hero.ctaText}
                </button>
                ${hero.ctaSecondary ? `
                <button class="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-white hover:text-gray-900 transition-colors">
                    ${hero.ctaSecondary}
                </button>
                ` : ''}
            </div>
        </div>
    </section>
  `;
}

function renderBenefitsSection(benefits: any): string {
  return `
    <section class="py-16 bg-gray-50">
        <div class="max-w-6xl mx-auto px-6">
            <div class="text-center mb-12">
                <h2 class="text-3xl font-bold mb-4">${benefits.title}</h2>
                ${benefits.subtitle ? `<p class="text-lg text-gray-600">${benefits.subtitle}</p>` : ''}
            </div>
            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                ${benefits.benefits.map((benefit: any) => `
                    <div class="bg-white p-6 rounded-lg shadow-sm">
                        <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                            <span class="text-2xl">✓</span>
                        </div>
                        <h3 class="text-xl font-semibold mb-3">${benefit.title}</h3>
                        <p class="text-gray-600">${benefit.description}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    </section>
  `;
}

function renderFeaturesSection(features: any): string {
  return `
    <section class="py-16">
        <div class="max-w-6xl mx-auto px-6">
            <div class="text-center mb-12">
                <h2 class="text-3xl font-bold mb-4">${features.title}</h2>
                ${features.subtitle ? `<p class="text-lg text-gray-600">${features.subtitle}</p>` : ''}
            </div>
            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                ${features.features.map((feature: any) => `
                    <div class="text-center">
                        <div class="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                            <span class="text-2xl text-white">⚡</span>
                        </div>
                        <h3 class="text-xl font-semibold mb-3">${feature.title}</h3>
                        <p class="text-gray-600">${feature.description}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    </section>
  `;
}

function renderTestimonialsSection(testimonials: any): string {
  return `
    <section class="py-16 bg-gray-50">
        <div class="max-w-6xl mx-auto px-6">
            <div class="text-center mb-12">
                <h2 class="text-3xl font-bold mb-4">${testimonials.title}</h2>
            </div>
            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                ${testimonials.testimonials.map((testimonial: any) => `
                    <div class="bg-white p-6 rounded-lg shadow-sm">
                        <div class="flex mb-4">
                            ${Array(testimonial.rating || 5).fill('⭐').join('')}
                        </div>
                        <p class="text-gray-700 mb-4">"${testimonial.quote}"</p>
                        <div>
                            <p class="font-semibold">${testimonial.author}</p>
                            <p class="text-sm text-gray-600">${testimonial.role}${testimonial.company ? `, ${testimonial.company}` : ''}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    </section>
  `;
}

function renderPricingSection(pricing: any): string {
  return `
    <section class="py-16">
        <div class="max-w-6xl mx-auto px-6">
            <div class="text-center mb-12">
                <h2 class="text-3xl font-bold mb-4">${pricing.title}</h2>
                ${pricing.subtitle ? `<p class="text-lg text-gray-600">${pricing.subtitle}</p>` : ''}
            </div>
            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                ${pricing.plans.map((plan: any) => `
                    <div class="bg-white border-2 ${plan.highlighted ? 'border-blue-500' : 'border-gray-200'} rounded-lg p-6 ${plan.highlighted ? 'transform scale-105' : ''}">
                        ${plan.highlighted ? '<div class="bg-blue-500 text-white text-sm font-semibold px-3 py-1 rounded-full inline-block mb-4">Most Popular</div>' : ''}
                        <h3 class="text-xl font-bold mb-2">${plan.name}</h3>
                        <div class="mb-4">
                            <span class="text-3xl font-bold">${plan.price}</span>
                            <span class="text-gray-600">/${plan.period}</span>
                        </div>
                        <ul class="space-y-2 mb-6">
                            ${plan.features.map((feature: string) => `
                                <li class="flex items-center">
                                    <span class="text-green-500 mr-2">✓</span>
                                    ${feature}
                                </li>
                            `).join('')}
                        </ul>
                        <button class="w-full py-3 px-6 rounded-lg font-semibold ${plan.highlighted ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'} transition-colors">
                            ${plan.ctaText || 'Get Started'}
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
    </section>
  `;
}

function renderFaqSection(faq: any): string {
  return `
    <section class="py-16 bg-gray-50">
        <div class="max-w-4xl mx-auto px-6">
            <div class="text-center mb-12">
                <h2 class="text-3xl font-bold mb-4">${faq.title}</h2>
            </div>
            <div class="space-y-4">
                ${faq.questions.map((item: any, index: number) => `
                    <div class="bg-white rounded-lg border">
                        <button class="w-full text-left p-6 font-semibold flex justify-between items-center" onclick="toggleFaq(${index})">
                            ${item.question}
                            <span id="faq-icon-${index}">+</span>
                        </button>
                        <div id="faq-answer-${index}" class="hidden p-6 pt-0 text-gray-600">
                            ${item.answer}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        <script>
            function toggleFaq(index) {
                const answer = document.getElementById('faq-answer-' + index);
                const icon = document.getElementById('faq-icon-' + index);
                if (answer.classList.contains('hidden')) {
                    answer.classList.remove('hidden');
                    icon.textContent = '-';
                } else {
                    answer.classList.add('hidden');
                    icon.textContent = '+';
                }
            }
        </script>
    </section>
  `;
}

function renderFinalCtaSection(finalCta: any): string {
  return `
    <section class="py-20 bg-blue-600 text-white">
        <div class="max-w-4xl mx-auto px-6 text-center">
            <h2 class="text-4xl font-bold mb-6">${finalCta.headline}</h2>
            <p class="text-xl mb-8 opacity-90">${finalCta.subtext}</p>
            ${finalCta.features ? `
                <div class="flex flex-wrap justify-center gap-6 mb-8">
                    ${finalCta.features.map((feature: string) => `
                        <div class="flex items-center">
                            <span class="text-green-400 mr-2">✓</span>
                            ${feature}
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            <button class="bg-white text-blue-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition-colors">
                ${finalCta.ctaText}
            </button>
        </div>
    </section>
  `;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pageId = url.pathname.split('/').pop();

    if (!pageId) {
      throw new Error('Page ID is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Fetch the page data
    const { data: pageData, error } = await supabaseClient
      .from('generated_pages')
      .select('*')
      .eq('id', pageId)
      .single();

    if (error || !pageData) {
      console.error('Page not found:', error);
      return new Response(
        `<html><body><h1>Page Not Found</h1><p>The requested page could not be found.</p></body></html>`,
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'text/html' }
        }
      );
    }

    // Generate HTML from page data
    const html = generateHTML(pageData);

    return new Response(html, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html' }
    });

  } catch (error) {
    console.error('Error in render-page function:', error);
    return new Response(
      `<html><body><h1>Error</h1><p>${error instanceof Error ? error.message : 'An unexpected error occurred'}</p></body></html>`,
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' }
      }
    );
  }
});