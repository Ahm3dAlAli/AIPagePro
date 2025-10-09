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

    console.log('Integrating Sitecore XM Cloud components for page:', pageId);

    // Fetch all component exports with Sitecore manifests
    const { data: components, error: fetchError } = await supabaseClient
      .from('component_exports')
      .select('*')
      .eq('page_id', pageId)
      .not('sitecore_manifest', 'is', null);

    if (fetchError) {
      console.error('Error fetching components:', fetchError);
      throw new Error('Failed to fetch components');
    }

    if (!components || components.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No Sitecore components found to integrate',
          componentsIntegrated: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${components.length} Sitecore components to integrate`);

    // Prepare integration package
    const integrationPackage = {
      components: components.map(comp => ({
        name: comp.component_name,
        type: comp.component_type,
        reactCode: comp.react_code,
        jsonSchema: comp.json_schema,
        manifest: comp.sitecore_manifest
      })),
      metadata: {
        pageId,
        generatedAt: new Date().toISOString(),
        totalComponents: components.length
      }
    };

    // Store integration package in database for retrieval
    const { error: updateError } = await supabaseClient
      .from('generated_pages')
      .update({
        sitecore_integration_data: integrationPackage,
        updated_at: new Date().toISOString()
      })
      .eq('id', pageId);

    if (updateError) {
      console.error('Error storing integration package:', updateError);
      throw new Error('Failed to store integration package');
    }

    console.log('✓ Integration package prepared successfully');

    return new Response(
      JSON.stringify({
        success: true,
        componentsIntegrated: components.length,
        message: 'Sitecore XM Cloud integration package ready',
        downloadUrl: `${Deno.env.get('SUPABASE_URL')}/rest/v1/generated_pages?id=eq.${pageId}&select=sitecore_integration_data`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in integrate-sitecore-xm-cloud:', error);
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
