import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient as createSupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { createClient } from 'npm:v0-sdk@0.14.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeployRequest {
  pageId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting v0 deployment');
    
    const V0_API_KEY = Deno.env.get('V0_API_KEY');
    if (!V0_API_KEY) {
      throw new Error('V0_API_KEY is not configured');
    }

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

    const { pageId } = await req.json() as DeployRequest;
    
    if (!pageId) {
      throw new Error('Page ID is required');
    }

    console.log('Deploying page:', pageId);

    // Get page data to retrieve chatId
    const { data: pageData, error: pageError } = await supabaseClient
      .from('generated_pages')
      .select('content')
      .eq('id', pageId)
      .single();

    if (pageError || !pageData) {
      throw new Error('Page not found');
    }

    const chatId = pageData.content?.chatId;
    if (!chatId) {
      throw new Error('Chat ID not found in page data');
    }

    console.log('Chat ID:', chatId);

    // Initialize v0 client
    const v0 = createClient({ apiKey: V0_API_KEY });

    // Get chat details to retrieve project ID and latest version
    const chat = await v0.chats.getById({ chatId });
    
    console.log('Chat details retrieved');
    console.log('Project ID:', chat.projectId);
    console.log('Latest version:', chat.latestVersion?.id);

    if (!chat.projectId) {
      throw new Error('Project ID not found in chat');
    }

    if (!chat.latestVersion?.id) {
      throw new Error('No version available for deployment');
    }

    // Create deployment
    console.log('Creating deployment...');
    const deployment = await v0.deployments.create({
      projectId: chat.projectId,
      chatId: chatId,
      versionId: chat.latestVersion.id,
    });

    console.log('Deployment created:', deployment.id);
    console.log('Deployment URL:', deployment.webUrl);

    // Save deployment record to database
    const { error: deploymentError } = await supabaseClient
      .from('deployment_records')
      .insert({
        user_id: userId,
        page_id: pageId,
        deployment_platform: 'v0-vercel',
        deployment_url: deployment.webUrl,
        deployment_status: 'completed',
        deployed_at: new Date().toISOString(),
        deployment_config: {
          deploymentId: deployment.id,
          projectId: chat.projectId,
          chatId: chatId,
          versionId: chat.latestVersion.id,
          inspectorUrl: deployment.inspectorUrl,
        },
      });

    if (deploymentError) {
      console.error('Error saving deployment record:', deploymentError);
    }

    // Update page with deployment URL
    await supabaseClient
      .from('generated_pages')
      .update({
        published_url: deployment.webUrl,
        status: 'published',
        updated_at: new Date().toISOString(),
      })
      .eq('id', pageId);

    return new Response(
      JSON.stringify({ 
        success: true,
        deploymentId: deployment.id,
        deploymentUrl: deployment.webUrl,
        inspectorUrl: deployment.inspectorUrl,
        message: 'Deployment successful'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error deploying v0 app:', error);
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
