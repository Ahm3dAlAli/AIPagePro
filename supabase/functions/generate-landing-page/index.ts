import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Get the user
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { 
      campaignObjective,
      targetAudience, 
      uniqueValueProp,
      primaryBenefits,
      features,
      ctaText,
      toneOfVoice,
      industryType,
      pageTitle,
      seoKeywords,
      template
    } = await req.json();

    console.log('Generating landing page with OpenAI for user:', user.id);

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Create a comprehensive prompt for AI generation
    const basePrompt = template ? 
      `You are an expert landing page designer and copywriter. Customize this existing template with the new campaign details:

Template to customize: ${JSON.stringify(template.config)}

New campaign inputs:` :
      `You are an expert landing page designer and copywriter. Create a high-converting landing page based on these inputs:`;
    
    const prompt = `${basePrompt}

Campaign Objective: ${campaignObjective}
Target Audience: ${targetAudience}
Unique Value Proposition: ${uniqueValueProp}
Primary Benefits: ${primaryBenefits}
Features: ${features}
Primary CTA: ${ctaText}
Tone of Voice: ${toneOfVoice}
Industry: ${industryType}
SEO Keywords: ${seoKeywords}

Generate a complete landing page structure with the following sections:
1. Hero section with compelling headline and subheadline
2. Benefits section highlighting key value propositions
3. Features section with detailed functionality
4. Social proof/testimonials section
5. Pricing or offer section
6. FAQ section addressing common objections
7. Final CTA section

Return ONLY a JSON object with this exact structure:
{
  "pageTitle": "SEO-optimized page title",
  "metaDescription": "Compelling meta description under 160 characters",
  "sections": {
    "hero": {
      "headline": "Compelling main headline",
      "subheadline": "Supporting subheadline",
      "ctaText": "Primary call-to-action text",
      "backgroundStyle": "gradient-blue" | "gradient-purple" | "solid-dark" | "minimal"
    },
    "benefits": {
      "title": "Section title",
      "benefits": [
        {
          "title": "Benefit title",
          "description": "Benefit description",
          "icon": "icon-name"
        }
      ]
    },
    "features": {
      "title": "Section title",
      "features": [
        {
          "title": "Feature title", 
          "description": "Feature description",
          "icon": "icon-name"
        }
      ]
    },
    "testimonials": {
      "title": "Section title",
      "testimonials": [
        {
          "quote": "Testimonial text",
          "author": "Author Name",
          "role": "Job Title",
          "company": "Company Name"
        }
      ]
    },
    "pricing": {
      "title": "Section title",
      "plans": [
        {
          "name": "Plan name",
          "price": "$99",
          "period": "per month",
          "features": ["Feature 1", "Feature 2"],
          "highlighted": true | false
        }
      ]
    },
    "faq": {
      "title": "Section title", 
      "questions": [
        {
          "question": "Question text",
          "answer": "Answer text"
        }
      ]
    },
    "finalCta": {
      "headline": "Final CTA headline",
      "subtext": "Supporting text",
      "ctaText": "Button text"
    }
  },
  "designRationale": "Explanation of design decisions based on target audience and conversion goals"
}

Make sure all content is tailored to the target audience and optimized for conversions. Use persuasive copywriting techniques and ensure the messaging addresses pain points and desired outcomes.`;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          {
            role: 'system',
            content: 'You are an expert landing page designer and copywriter specializing in high-conversion pages. Always return valid JSON responses.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_completion_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const openAIData = await response.json();
    console.log('OpenAI response received');

    let generatedContent;
    try {
      const contentText = openAIData.choices[0].message.content;
      
      // Clean up the JSON response
      const jsonStart = contentText.indexOf('{');
      const jsonEnd = contentText.lastIndexOf('}') + 1;
      const jsonString = contentText.slice(jsonStart, jsonEnd);
      
      generatedContent = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      throw new Error('Failed to parse AI response');
    }

    // Generate a unique slug for the page
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const slug = `page-${timestamp}-${randomSuffix}`;

    // Save the generated page to database
    const { data: savedPage, error: saveError } = await supabaseClient
      .from('generated_pages')
      .insert({
        user_id: user.id,
        title: generatedContent.pageTitle || pageTitle,
        slug: slug,
        content: generatedContent,
        seo_config: {
          title: generatedContent.pageTitle,
          description: generatedContent.metaDescription,
          keywords: seoKeywords
        },
        status: 'draft'
      })
      .select()
      .single();

    if (saveError) {
      console.error('Database save error:', saveError);
      throw new Error('Failed to save generated page');
    }

    console.log('Page saved successfully:', savedPage.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        page: savedPage,
        content: generatedContent
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate-landing-page function:', error);
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