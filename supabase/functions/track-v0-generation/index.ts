import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient as createSupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TrackingRequest {
  pageId: string;
  chatId: string;
  action: 'start' | 'progress' | 'complete' | 'error';
  data?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Tracking v0 generation event');
    
    const supabaseClient = createSupabaseClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader) {
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

    const { pageId, chatId, action, data } = await req.json() as TrackingRequest;
    
    console.log(`Tracking ${action} for page ${pageId}, chat ${chatId}`);

    // Get current page data
    const { data: pageData, error: fetchError } = await supabaseClient
      .from('generated_pages')
      .select('content')
      .eq('id', pageId)
      .single();

    if (fetchError) {
      console.error('Error fetching page:', fetchError);
      throw new Error('Page not found');
    }

    const currentContent = pageData.content || {};
    
    // Update based on action
    let updatedContent = { ...currentContent };
    
    switch (action) {
      case 'start':
        updatedContent = {
          ...currentContent,
          chatId,
          status: 'generating',
          generationStarted: new Date().toISOString(),
          trackingEvents: [{
            action: 'start',
            timestamp: new Date().toISOString(),
            data
          }]
        };
        break;
        
      case 'progress':
        const events = currentContent.trackingEvents || [];
        updatedContent = {
          ...currentContent,
          status: 'generating',
          lastProgress: new Date().toISOString(),
          progressData: data,
          trackingEvents: [...events, {
            action: 'progress',
            timestamp: new Date().toISOString(),
            data
          }]
        };
        break;
        
      case 'complete':
        updatedContent = {
          ...currentContent,
          status: 'completed',
          generationCompleted: new Date().toISOString(),
          completionData: data,
          trackingEvents: [...(currentContent.trackingEvents || []), {
            action: 'complete',
            timestamp: new Date().toISOString(),
            data
          }]
        };
        
        // Trigger background tasks in parallel (fire and forget)
        (async () => {
          console.log('Starting post-generation background tasks...');
          
          // Fetch files, generate AI rationale, and Sitecore components in parallel
          const [fetchResult, rationaleResult, sitecoreResult] = await Promise.allSettled([
            supabaseClient.functions.invoke('fetch-v0-files', {
              body: { pageId, chatId }
            }),
            supabaseClient.functions.invoke('generate-ai-rationale', {
              body: { pageId }
            }),
            supabaseClient.functions.invoke('generate-sitecore-components', {
              body: { pageId }
            })
          ]);
          
          // Log results
          if (fetchResult.status === 'fulfilled' && !fetchResult.value.error) {
            console.log('✓ Files fetched successfully');
          } else {
            console.error('✗ Error fetching files:', fetchResult.status === 'fulfilled' ? fetchResult.value.error : fetchResult.reason);
          }
          
          if (rationaleResult.status === 'fulfilled' && !rationaleResult.value.error) {
            console.log('✓ AI rationale generated successfully');
          } else {
            console.error('✗ Error generating AI rationale:', rationaleResult.status === 'fulfilled' ? rationaleResult.value.error : rationaleResult.reason);
          }
          
          if (sitecoreResult.status === 'fulfilled' && !sitecoreResult.value.error) {
            console.log('✓ Sitecore components generated successfully');
          } else {
            console.error('✗ Error generating Sitecore components:', sitecoreResult.status === 'fulfilled' ? sitecoreResult.value.error : sitecoreResult.reason);
          }
        })();
        break;
        
      case 'error':
        updatedContent = {
          ...currentContent,
          status: 'error',
          error: data?.error || 'Unknown error',
          errorTimestamp: new Date().toISOString(),
          trackingEvents: [...(currentContent.trackingEvents || []), {
            action: 'error',
            timestamp: new Date().toISOString(),
            data
          }]
        };
        break;
    }

    // Update page with tracking data
    const { error: updateError } = await supabaseClient
      .from('generated_pages')
      .update({
        content: updatedContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', pageId);

    if (updateError) {
      console.error('Error updating page:', updateError);
      throw updateError;
    }

    console.log(`Successfully tracked ${action} event`);

    return new Response(
      JSON.stringify({ 
        success: true,
        action,
        message: `Successfully tracked ${action} event`,
        autoFetchingFiles: action === 'complete'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error tracking v0 generation:', error);
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
