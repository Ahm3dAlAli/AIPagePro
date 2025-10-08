import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pageId } = await req.json();
    console.log('Generating AI rationale for page:', pageId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch page data
    const { data: page, error: pageError } = await supabase
      .from('generated_pages')
      .select('*')
      .eq('id', pageId)
      .single();

    if (pageError) throw pageError;

    // Fetch component exports
    const { data: components, error: componentsError } = await supabase
      .from('component_exports')
      .select('component_name, component_type, react_code')
      .eq('page_id', pageId);

    if (componentsError) throw componentsError;

    // Prepare analysis data with actual component code
    const componentsAnalysis = components?.map(c => ({
      name: c.component_name,
      type: c.component_type,
      code: c.react_code || ''
    })) || [];

    // Generate AI rationale using Lovable AI
    const prompt = `As a UX/UI and marketing expert, analyze this landing page and provide detailed rationale for the design decisions based on the actual implementation:

Page Title: ${page.title}

Components and Implementation:
${componentsAnalysis.map(c => `
## ${c.name} (${c.type})
\`\`\`tsx
${c.code}
\`\`\`
`).join('\n')}

Page Content Structure:
${JSON.stringify(page.content, null, 2)}

Page Sections Configuration:
${JSON.stringify(page.sections_config, null, 2)}

Please provide a comprehensive analysis covering:

1. **Design Strategy**: Why this layout and component structure was chosen based on the code
2. **User Experience**: How the implementation facilitates user journey and conversion
3. **Visual Hierarchy**: Analysis of information architecture and content flow in the components
4. **Component Choices**: Rationale for each component's implementation and its placement
5. **Conversion Optimization**: How specific code elements and interactions support the primary goals
6. **Accessibility & Performance**: Implementation considerations for accessibility and performance
7. **Brand Consistency**: Design decisions in the code that maintain brand identity

Format your response in clear sections with actionable insights based on the actual implementation.`;

    console.log('Calling Lovable AI for rationale generation...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an expert UX/UI designer and conversion optimization specialist. Provide detailed, actionable design rationale based on best practices.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API Error:', aiResponse.status, errorText);
      throw new Error(`AI API returned ${aiResponse.status}: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const rationale = aiData.choices[0].message.content;

    console.log('AI rationale generated successfully');

    // Store the rationale in the database
    const { error: updateError } = await supabase
      .from('generated_pages')
      .update({
        ai_rationale: rationale,
        updated_at: new Date().toISOString()
      })
      .eq('id', pageId);

    if (updateError) {
      console.error('Error storing rationale:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        rationale,
        success: true 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in generate-ai-rationale:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
