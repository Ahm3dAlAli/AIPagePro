import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient as createSupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CopyRequest {
  templateId: string;
  newPageId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Copying template files to new page');
    
    const supabaseClient = createSupabaseClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const userClient = createSupabaseClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { 
          global: { 
            headers: { 
              Authorization: authHeader 
            } 
          }
        }
      );
      
      const { data: { user } } = await userClient.auth.getUser();
      userId = user?.id || '00000000-0000-0000-0000-000000000000';
    } else {
      userId = '00000000-0000-0000-0000-000000000000';
    }

    const { templateId, newPageId } = await req.json() as CopyRequest;
    
    console.log('Fetching template:', templateId);
    
    // Get template details
    const { data: template, error: templateError } = await supabaseClient
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError) {
      throw new Error(`Template not found: ${templateError.message}`);
    }

    console.log('Template found:', template.name);

    // Get all component exports associated with this template
    // Templates can have component exports linked via a reference page_id in config
    let componentExports: any[] = [];
    
    if (template.config?.referencePageId) {
      const { data: components, error: componentsError } = await supabaseClient
        .from('component_exports')
        .select('*')
        .eq('page_id', template.config.referencePageId);

      if (!componentsError && components) {
        componentExports = components;
      }
    }

    console.log('Found', componentExports.length, 'component exports to copy');

    // Copy each component export to the new page
    let copiedCount = 0;
    
    for (const component of componentExports) {
      try {
        const { error } = await supabaseClient
          .from('component_exports')
          .insert({
            user_id: userId,
            page_id: newPageId,
            component_name: component.component_name,
            component_type: component.component_type,
            react_code: component.react_code,
            export_format: component.export_format,
            json_schema: {
              ...component.json_schema,
              copiedFromTemplate: templateId,
              copiedAt: new Date().toISOString()
            },
            sitecore_manifest: component.sitecore_manifest || {}
          });

        if (error) {
          console.error('Error copying component:', error);
        } else {
          copiedCount++;
          console.log(`Copied: ${component.component_name}`);
        }
      } catch (error) {
        console.error('Error processing component:', component.component_name, error);
      }
    }

    // Update the new page with template information
    await supabaseClient
      .from('generated_pages')
      .update({
        content: {
          ...(template.config || {}),
          templateId: templateId,
          templateName: template.name,
          filesCount: copiedCount,
          status: 'completed',
          copiedAt: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', newPageId);

    console.log(`Successfully copied ${copiedCount} files from template`);

    return new Response(
      JSON.stringify({ 
        success: true,
        copiedCount: copiedCount,
        templateName: template.name,
        message: `Successfully copied ${copiedCount} files from ${template.name} template`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error copying template files:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to copy template files'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
