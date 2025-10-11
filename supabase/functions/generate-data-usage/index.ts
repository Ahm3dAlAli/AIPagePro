import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { pageId } = await req.json();

    // Fetch page data
    const { data: pageData, error: pageError } = await supabaseClient
      .from('generated_pages')
      .select('*')
      .eq('id', pageId)
      .single();

    if (pageError) throw pageError;

    // Fetch historic campaigns
    const { data: campaigns, error: campaignsError } = await supabaseClient
      .from('historic_campaigns')
      .select('*')
      .eq('user_id', user.id)
      .limit(10);

    if (campaignsError) throw campaignsError;

    // Fetch experiment results
    const { data: experiments, error: experimentsError } = await supabaseClient
      .from('experiment_results')
      .select('*')
      .eq('user_id', user.id)
      .limit(10);

    if (experimentsError) throw experimentsError;

    // Fetch page sections
    const { data: sections, error: sectionsError } = await supabaseClient
      .from('page_sections')
      .select('*')
      .eq('page_id', pageId)
      .eq('is_active', true);

    if (sectionsError) throw sectionsError;

    // Generate data usage analysis using AI
    const prompt = `You are a data analyst examining how historic campaign data and experiment results influenced landing page design decisions.

Page Title: ${pageData.title}
Page Content: ${JSON.stringify(pageData.content, null, 2)}
Page Sections: ${JSON.stringify(sections, null, 2)}

Historic Campaigns Data (${campaigns?.length || 0} campaigns):
${JSON.stringify(campaigns?.slice(0, 5), null, 2)}

Experiment Results (${experiments?.length || 0} experiments):
${JSON.stringify(experiments?.slice(0, 5), null, 2)}

Analyze and create a comprehensive data usage summary that shows:

1. **Campaign Fields Used**: Which specific campaign data fields (e.g., primary_conversion_rate, bounce_rate, utm_source) were analyzed and how they influenced design
2. **Experiment Results Applied**: Which A/B test winners informed page elements
3. **Data-to-Element Mapping**: Direct mapping between data sources and page elements (hero headline, CTA text, layout, etc.)
4. **Performance Metrics Analyzed**: Key metrics that shaped decisions
5. **Assumptions Made**: Any assumptions in applying historic data to this new page

Return a detailed JSON response in this exact structure:
{
  "campaign_fields_used": [
    {
      "field_name": "primary_conversion_rate",
      "field_value": "3.2%",
      "usage_context": "High-performing campaigns with >3% CR informed aggressive CTA placement"
    }
  ],
  "experiment_results_used": [
    {
      "experiment_name": "Hero CTA Button Color Test",
      "winning_variant": "Purple button",
      "applied_to": "Main hero section CTA button"
    }
  ],
  "mapping_to_elements": [
    {
      "data_source": "Campaign: Summer 2024 (4.5% CR)",
      "page_element": "Hero headline",
      "reasoning": "This campaign's urgent, benefit-focused headline outperformed others by 45%"
    }
  ],
  "performance_metrics_analyzed": [
    {
      "metric_name": "Average time on page",
      "value": 145,
      "influence_on_design": "Above-average engagement led to longer-form content in features section"
    }
  ],
  "assumptions_made": [
    {
      "assumption": "Past performance indicates future results",
      "rationale": "Historical top performers in similar audience segments",
      "confidence_level": "high"
    }
  ]
}`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Calling Lovable AI to generate data usage analysis...');
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'You are a data analyst specializing in marketing analytics and landing page optimization. Provide detailed, accurate analysis of how data influences design decisions.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      throw new Error(`AI generation failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;

    console.log('AI response received, parsing...');

    // Parse JSON from response
    let dataUsageReport;
    try {
      // Remove markdown code blocks if present
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      dataUsageReport = JSON.parse(jsonString.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Save to database
    const { data: reportData, error: insertError } = await supabaseClient
      .from('ai_rationale_reports')
      .insert({
        user_id: user.id,
        page_id: pageId,
        report_type: 'data_usage',
        rationale_data: dataUsageReport,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    console.log('Data usage report saved successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        dataUsage: dataUsageReport,
        reportId: reportData.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-data-usage:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
