import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateRequest {
  engineeringPrompt: string;
  prdDocument: any;
  campaignConfig: any;
  pageId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting v0 app generation');
    
    const V0_API_KEY = Deno.env.get('V0_API_KEY');
    if (!V0_API_KEY) {
      throw new Error('V0_API_KEY is not configured');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const userClient = createClient(
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

    const { engineeringPrompt, prdDocument, campaignConfig, pageId } = await req.json() as GenerateRequest;
    
    console.log('Calling v0 API...');
    console.log('Engineering prompt length:', engineeringPrompt?.length || 0);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 50000); // 50 second timeout
    
    try {
      const v0Response = await fetch('https://api.v0.dev/v1/chats', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${V0_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: engineeringPrompt
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!v0Response.ok) {
        const errorText = await v0Response.text();
        console.error('v0 API error:', v0Response.status, errorText);
        throw new Error(`v0 API failed: ${v0Response.status}`);
      }

      const v0Data = await v0Response.json();
      console.log('v0 API response received');
      console.log('Chat ID:', v0Data.id);
      console.log('Demo URL:', v0Data.demo);
      console.log('Files count:', v0Data.files?.length || 0);

      // Extract and save components
      const components = extractComponents(v0Data);
      
      if (pageId) {
        console.log('Saving v0 components...');
        await saveV0Components(supabaseClient, userId, pageId, {
          chatId: v0Data.id,
          demoUrl: v0Data.demo,
          components,
          files: v0Data.files,
          prdDocument,
          campaignConfig
        });
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          chatId: v0Data.id,
          demoUrl: v0Data.demo,
          filesCount: v0Data.files?.length || 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('v0 API request timed out');
        throw new Error('v0 API request timed out after 50 seconds');
      }
      throw fetchError;
    }

  } catch (error) {
    console.error('Error generating v0 app:', error);
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

function extractComponents(v0Data: any) {
  try {
    if (!v0Data.files || !Array.isArray(v0Data.files)) {
      return {
        mainComponent: null,
        components: [],
        styles: [],
        utilities: []
      };
    }

    const mainComponent = v0Data.files.find((f: any) => 
      f.name?.toLowerCase().includes('page') || 
      f.name?.toLowerCase().includes('landing') ||
      f.name?.toLowerCase().includes('app') ||
      f.name?.toLowerCase().includes('index')
    );

    const components = v0Data.files.filter((f: any) => 
      f.name?.toLowerCase().includes('component') ||
      f.type === 'component' ||
      (f.name?.endsWith('.tsx') && !f.name?.includes('page'))
    );

    const styles = v0Data.files.filter((f: any) => 
      f.name?.endsWith('.css') || f.name?.endsWith('.scss')
    );

    const utilities = v0Data.files.filter((f: any) => 
      f.name?.includes('util') || 
      f.name?.includes('helper') ||
      f.name?.includes('lib')
    );

    return {
      mainComponent,
      components,
      styles,
      utilities,
      allFiles: v0Data.files
    };
  } catch (error) {
    console.error('Error extracting components:', error);
    return {
      mainComponent: null,
      components: [],
      styles: [],
      utilities: [],
      error: error.message
    };
  }
}

async function saveV0Components(
  supabaseClient: any,
  userId: string,
  pageId: string,
  v0Result: any
) {
  try {
    // Update the generated_pages table with v0 data
    const { error: updateError } = await supabaseClient
      .from('generated_pages')
      .update({
        content: {
          ...v0Result,
          generatedWith: 'v0-api',
          timestamp: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', pageId);

    if (updateError) {
      console.error('Error updating page with v0 data:', updateError);
      throw updateError;
    }

    // Create component exports for each v0 component
    if (v0Result.components?.allFiles) {
      for (const file of v0Result.components.allFiles) {
        if (file.name?.endsWith('.tsx') || file.name?.endsWith('.jsx')) {
          await supabaseClient
            .from('component_exports')
            .insert({
              user_id: userId,
              page_id: pageId,
              component_name: file.name?.replace(/\.(tsx|jsx)$/, '') || 'component',
              component_type: file.name?.includes('page') ? 'page' : 'component',
              react_code: file.content || '',
              export_format: 'react_tsx',
              json_schema: {
                fileName: file.name,
                type: file.type,
                generatedBy: 'v0-api'
              },
              sitecore_manifest: {}
            });
        }
      }
    }

    console.log('v0 components saved successfully');
  } catch (error) {
    console.error('Error saving v0 components:', error);
    throw error;
  }
}
