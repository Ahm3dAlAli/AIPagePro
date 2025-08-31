import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generatePRDFromSections(sections: any[]): any {
  console.log('Generating PRD from sections:', sections.length);
  
  // Extract content from each section
  const heroSection = sections.find(s => s.section_type === 'hero');
  const benefitsSection = sections.find(s => s.section_type === 'benefits');
  const featuresSection = sections.find(s => s.section_type === 'features');
  const testimonialsSection = sections.find(s => s.section_type === 'testimonials');
  const pricingSection = sections.find(s => s.section_type === 'pricing');
  const faqSection = sections.find(s => s.section_type === 'faq');
  const finalCtaSection = sections.find(s => s.section_type === 'finalCta');

  // Generate PRD based on extracted content
  const prd = {
    // Campaign objective inferred from content
    campaignObjective: pricingSection ? 'product-sales' : 'lead-generation',
    
    // Target audience from hero and testimonials
    targetAudience: inferTargetAudience(heroSection, testimonialsSection),
    
    // Unique value proposition from hero
    uniqueValueProp: heroSection?.content?.headline || 'Transform your experience with our solution',
    
    // Primary benefits from benefits section
    primaryBenefits: formatBenefits(benefitsSection),
    
    // Features from features section
    features: formatFeatures(featuresSection),
    
    // CTA text from hero or final CTA
    ctaText: heroSection?.content?.ctaText || finalCtaSection?.content?.ctaText || 'Get Started Today',
    
    // Tone inferred from content style
    toneOfVoice: inferToneOfVoice(heroSection, benefitsSection),
    
    // Industry inferred from content
    industryType: inferIndustryType(featuresSection, benefitsSection),
    
    // Page title from hero
    pageTitle: heroSection?.content?.headline || 'Landing Page',
    
    // SEO keywords inferred from content
    seoKeywords: generateSEOKeywords(heroSection, benefitsSection, featuresSection),
    
    // Template preference
    template: 'conversion-focused'
  };

  console.log('Generated PRD:', prd);
  return prd;
}

function inferTargetAudience(heroSection: any, testimonialsSection: any): string {
  if (testimonialsSection?.content?.testimonials?.length > 0) {
    const roles = testimonialsSection.content.testimonials.map((t: any) => t.role).join(', ');
    return `Professionals including ${roles}`;
  }
  
  if (heroSection?.content?.subheadline) {
    return `Users looking for ${heroSection.content.subheadline.toLowerCase()}`;
  }
  
  return 'Business professionals and individuals seeking growth';
}

function formatBenefits(benefitsSection: any): string {
  if (!benefitsSection?.content?.benefits) {
    return `• Improved efficiency and results
• Cost-effective solution
• Easy to implement
• Proven track record`;
  }
  
  return benefitsSection.content.benefits
    .map((b: any) => `• ${b.title}: ${b.description}`)
    .join('\n');
}

function formatFeatures(featuresSection: any): string {
  if (!featuresSection?.content?.features) {
    return `• Comprehensive functionality
• User-friendly interface
• Advanced analytics
• 24/7 support`;
  }
  
  return featuresSection.content.features
    .map((f: any) => `• ${f.title}: ${f.description}`)
    .join('\n');
}

function inferToneOfVoice(heroSection: any, benefitsSection: any): string {
  const content = [
    heroSection?.content?.headline || '',
    heroSection?.content?.subheadline || '',
    benefitsSection?.content?.title || ''
  ].join(' ').toLowerCase();
  
  if (content.includes('professional') || content.includes('enterprise') || content.includes('business')) {
    return 'professional';
  }
  
  if (content.includes('amazing') || content.includes('incredible') || content.includes('love')) {
    return 'friendly';
  }
  
  return 'confident';
}

function inferIndustryType(featuresSection: any, benefitsSection: any): string {
  const content = [
    featuresSection?.content?.title || '',
    benefitsSection?.content?.title || '',
    featuresSection?.content?.features?.map((f: any) => f.title).join(' ') || ''
  ].join(' ').toLowerCase();
  
  if (content.includes('tech') || content.includes('software') || content.includes('digital')) {
    return 'Technology';
  }
  
  if (content.includes('business') || content.includes('sales') || content.includes('marketing')) {
    return 'Business Services';
  }
  
  if (content.includes('health') || content.includes('fitness') || content.includes('wellness')) {
    return 'Health & Wellness';
  }
  
  return 'General';
}

function generateSEOKeywords(heroSection: any, benefitsSection: any, featuresSection: any): string {
  const keywords = new Set<string>();
  
  // Extract keywords from headlines and titles
  const content = [
    heroSection?.content?.headline || '',
    benefitsSection?.content?.title || '',
    featuresSection?.content?.title || ''
  ].join(' ');
  
  // Simple keyword extraction (split by spaces, filter meaningful words)
  const words = content.toLowerCase()
    .split(' ')
    .filter(word => word.length > 3 && !['this', 'that', 'with', 'your', 'from', 'they', 'have'].includes(word))
    .slice(0, 8);
  
  words.forEach(word => keywords.add(word));
  
  return Array.from(keywords).join(', ');
}

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

    const { pageId } = await req.json();
    console.log('Generating PRD for page:', pageId);

    // Fetch all active sections for the page
    const { data: sections, error: sectionsError } = await supabaseClient
      .from('page_sections')
      .select('*')
      .eq('page_id', pageId)
      .eq('is_active', true)
      .order('section_type');

    if (sectionsError) {
      console.error('Error fetching sections:', sectionsError);
      throw new Error('Failed to fetch page sections');
    }

    if (!sections || sections.length === 0) {
      throw new Error('No sections found for this page');
    }

    // Generate PRD from sections
    const prd = generatePRDFromSections(sections);

    // Now use the PRD to generate a landing page with Lovable's algorithm
    const landingPageResponse = await supabaseClient.functions.invoke('generate-landing-page', {
      body: prd
    });

    if (landingPageResponse.error) {
      console.error('Landing page generation error:', landingPageResponse.error);
      throw new Error('Failed to generate landing page from PRD');
    }

    const { page: generatedPage } = landingPageResponse.data;

    return new Response(
      JSON.stringify({ 
        success: true, 
        prd,
        generatedPage,
        previewUrl: `https://gidmisqzkobynomutdgp.supabase.co/functions/v1/render-page/${generatedPage.id}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-prd function:', error);
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