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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { pageId } = await req.json();
    
    if (!pageId) {
      throw new Error('pageId is required');
    }

    console.log('Generating Sitecore components for page:', pageId);

    // Fetch all v0 component files for this page
    const { data: components, error: fetchError } = await supabaseClient
      .from('component_exports')
      .select('*')
      .eq('page_id', pageId)
      .eq('export_format', 'react_tsx');

    if (fetchError) {
      console.error('Error fetching components:', fetchError);
      throw new Error('Failed to fetch components');
    }

    if (!components || components.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No components found to process',
          processedCount: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${components.length} components to process`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    let processedCount = 0;
    const results = [];

    for (const component of components) {
      try {
        console.log(`Processing component: ${component.component_name}`);

        // Use AI to generate Sitecore BYOC format
        const sitecoreData = await generateSitecoreComponent(
          LOVABLE_API_KEY,
          component.react_code,
          component.component_name,
          component.component_type
        );

        // Update the component with Sitecore data
        const { error: updateError } = await supabaseClient
          .from('component_exports')
          .update({
            json_schema: sitecoreData.jsonSchema,
            sitecore_manifest: sitecoreData.manifest,
            react_code: sitecoreData.sitecoreCode,
            updated_at: new Date().toISOString()
          })
          .eq('id', component.id);

        if (updateError) {
          console.error(`Error updating component ${component.component_name}:`, updateError);
          results.push({
            component: component.component_name,
            success: false,
            error: updateError.message
          });
        } else {
          processedCount++;
          results.push({
            component: component.component_name,
            success: true
          });
          console.log(`✓ Updated ${component.component_name} with Sitecore format`);
        }

      } catch (error) {
        console.error(`Error processing ${component.component_name}:`, error);
        results.push({
          component: component.component_name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processedCount,
        totalComponents: components.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-sitecore-components:', error);
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

async function generateSitecoreComponent(
  apiKey: string,
  reactCode: string,
  componentName: string,
  componentType: string
): Promise<{
  sitecoreCode: string;
  jsonSchema: any;
  manifest: any;
}> {
  const prompt = `You are an expert in Sitecore JSS and React components. Convert the following React component into Sitecore BYOC (Bring Your Own Components) format.

Component Name: ${componentName}
Component Type: ${componentType}

Original React Code:
\`\`\`tsx
${reactCode}
\`\`\`

Generate THREE outputs in JSON format:

1. sitecoreCode: The React component wrapped for Sitecore JSS with:
   - Import statements for Sitecore JSS
   - withDatasourceCheck HOC wrapper
   - ComponentProps interface with 'fields' typed properly
   - Proper field value extraction using Sitecore field helpers

2. jsonSchema: A JSON schema defining all editable fields with:
   - Field names, types (SingleLineText, RichText, Image, etc.)
   - Display names and descriptions
   - Default values where appropriate

3. manifest: A Sitecore component manifest with:
   - Component name and display name
   - Icon and category
   - Field definitions matching the schema
   - Rendering parameters if needed

Return ONLY valid JSON in this exact structure:
{
  "sitecoreCode": "import { withDatasourceCheck } from '@sitecore-jss/sitecore-jss-nextjs';\\n...",
  "jsonSchema": { "fields": [...] },
  "manifest": { "name": "...", "displayName": "...", "fields": [...] }
}`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: 'You are a Sitecore JSS expert. Always return valid JSON only, no markdown or explanation.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI API error:', response.status, errorText);
    throw new Error(`AI API failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  console.log('AI Response for', componentName, ':', content.substring(0, 200));

  // Parse the JSON response
  let parsed;
  try {
    // Remove markdown code blocks if present
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch (parseError) {
    console.error('Failed to parse AI response:', content);
    throw new Error('AI returned invalid JSON');
  }

  return {
    sitecoreCode: parsed.sitecoreCode || reactCode,
    jsonSchema: parsed.jsonSchema || { fields: [] },
    manifest: parsed.manifest || {
      name: componentName,
      displayName: componentName,
      fields: []
    }
  };
}
