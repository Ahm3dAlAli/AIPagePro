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

    const { pageId, sectionType, prompt, currentContent } = await req.json();

    console.log('Generating section:', { pageId, sectionType, prompt });

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Create section-specific prompt
    const sectionPrompt = `You are an expert landing page copywriter. Generate content for a ${sectionType} section based on this prompt:

${prompt}

${currentContent ? `Current content to improve: ${JSON.stringify(currentContent)}` : ''}

Generate ONLY a JSON object with content optimized for conversions:

${getSectionTemplate(sectionType)}

Focus on persuasive copywriting, clear value propositions, and conversion optimization. Use action-oriented language and address customer pain points.`;

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
            content: 'You are an expert landing page copywriter specializing in high-conversion content. Always return valid JSON responses.'
          },
          {
            role: 'user',
            content: sectionPrompt
          }
        ],
        max_completion_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const openAIData = await response.json();
    let generatedContent;
    
    try {
      const contentText = openAIData.choices[0].message.content;
      const jsonStart = contentText.indexOf('{');
      const jsonEnd = contentText.lastIndexOf('}') + 1;
      const jsonString = contentText.slice(jsonStart, jsonEnd);
      generatedContent = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      throw new Error('Failed to parse AI response');
    }

    // Save section to database
    const { data: savedSection, error: saveError } = await supabaseClient
      .from('page_sections')
      .upsert({
        page_id: pageId,
        user_id: user.id,
        section_type: sectionType,
        content: generatedContent,
        ai_prompt: prompt,
        is_active: true
      })
      .select()
      .single();

    if (saveError) {
      console.error('Database save error:', saveError);
      throw new Error('Failed to save section');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        section: savedSection,
        content: generatedContent
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-section function:', error);
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

function getSectionTemplate(sectionType: string): string {
  switch (sectionType) {
    case 'hero':
      return `{
        "headline": "Main compelling headline",
        "subheadline": "Supporting subheadline",
        "ctaText": "Primary call-to-action",
        "ctaSecondary": "Secondary CTA (optional)",
        "backgroundStyle": "gradient-primary" | "gradient-secondary" | "solid"
      }`;
    
    case 'benefits':
      return `{
        "title": "Section title",
        "subtitle": "Optional subtitle",
        "benefits": [
          {
            "title": "Benefit title",
            "description": "Benefit description",
            "icon": "icon-name"
          }
        ]
      }`;
    
    case 'features':
      return `{
        "title": "Section title",
        "subtitle": "Optional subtitle", 
        "features": [
          {
            "title": "Feature title",
            "description": "Feature description",
            "icon": "icon-name"
          }
        ]
      }`;
    
    case 'testimonials':
      return `{
        "title": "Section title",
        "testimonials": [
          {
            "quote": "Customer testimonial",
            "author": "Customer Name",
            "role": "Job Title",
            "company": "Company Name",
            "rating": 5
          }
        ]
      }`;
    
    case 'pricing':
      return `{
        "title": "Section title",
        "subtitle": "Optional subtitle",
        "plans": [
          {
            "name": "Plan name",
            "price": "$99",
            "period": "per month",
            "features": ["Feature 1", "Feature 2"],
            "highlighted": true | false,
            "ctaText": "Get Started"
          }
        ]
      }`;
    
    case 'faq':
      return `{
        "title": "Section title",
        "questions": [
          {
            "question": "Question text",
            "answer": "Detailed answer"
          }
        ]
      }`;
    
    case 'finalCta':
      return `{
        "headline": "Final compelling CTA headline",
        "subtext": "Supporting text or urgency",
        "ctaText": "Primary button text",
        "features": ["Key benefit 1", "Key benefit 2"]
      }`;
    
    default:
      return `{
        "title": "Section title",
        "content": "Section content"
      }`;
  }
}