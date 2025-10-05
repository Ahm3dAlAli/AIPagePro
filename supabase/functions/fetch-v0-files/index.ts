import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient as createSupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { v0 } from 'https://esm.sh/v0-sdk@0.14.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FetchRequest {
  pageId: string;
  chatId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching v0 files and storing in database');
    
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

    const { pageId, chatId } = await req.json() as FetchRequest;
    
    console.log('Fetching files from v0 chat:', chatId);
    console.log('Using v0 API key:', V0_API_KEY ? 'configured' : 'missing');
    
    // Get chat details which includes all messages and files
    const chat = await v0.chats.get(chatId);
    
    console.log('Chat retrieved:', chat.id);
    console.log('Messages count:', chat.messages?.length || 0);

    // Extract all files from chat messages
    // v0 SDK returns files in the chat.files array or in message.files
    let allFiles: any[] = [];
    
    // First check if chat has direct files array
    if (chat.files && Array.isArray(chat.files)) {
      allFiles = chat.files;
      console.log('Found files in chat.files:', allFiles.length);
    }
    
    // Also check messages for files (fallback)
    if (allFiles.length === 0 && chat.messages && chat.messages.length > 0) {
      // Get the last assistant message which should have the generated files
      const lastAssistantMessage = [...chat.messages]
        .reverse()
        .find((msg: any) => msg.role === 'assistant');
      
      if (lastAssistantMessage && lastAssistantMessage.files) {
        allFiles = lastAssistantMessage.files;
        console.log('Found files in last assistant message:', allFiles.length);
      }
    }

    if (allFiles.length === 0) {
      console.log('No files found in chat messages');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'No files found in v0 chat',
          message: 'The v0 chat does not contain any generated files yet'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Clear existing component exports for this page
    console.log('Clearing existing components for page:', pageId);
    await supabaseClient
      .from('component_exports')
      .delete()
      .eq('page_id', pageId);

    // Save each file as a component export
    console.log('Saving', allFiles.length, 'files to database');
    let savedCount = 0;
    
    for (const file of allFiles) {
      try {
        const componentName = file.name?.replace(/\.(tsx|jsx|ts|js)$/, '') || 'component';
        const componentType = determineComponentType(file.name, file.type);
        const exportFormat = determineExportFormat(file.name);

        const { error } = await supabaseClient
          .from('component_exports')
          .insert({
            user_id: userId,
            page_id: pageId,
            component_name: componentName,
            component_type: componentType,
            react_code: file.content || '',
            export_format: exportFormat,
            json_schema: {
              fileName: file.name,
              fileType: file.type,
              language: file.language || 'typescript',
              generatedBy: 'v0-api',
              chatId: chatId,
              fetchedAt: new Date().toISOString()
            },
            sitecore_manifest: {}
          });

        if (error) {
          console.error('Error saving component:', error);
        } else {
          savedCount++;
          console.log(`Saved: ${componentName} (${exportFormat})`);
        }
      } catch (error) {
        console.error('Error processing file:', file.name, error);
      }
    }

    // Update the generated_pages table with success status
    await supabaseClient
      .from('generated_pages')
      .update({
        content: {
          chatId: chatId,
          demoUrl: chat.demo,
          filesCount: allFiles.length,
          savedCount: savedCount,
          status: 'completed',
          lastFetched: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', pageId);

    console.log(`Successfully saved ${savedCount} out of ${allFiles.length} files`);

    return new Response(
      JSON.stringify({ 
        success: true,
        filesCount: allFiles.length,
        savedCount: savedCount,
        message: `Successfully fetched and stored ${savedCount} files from v0`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error fetching v0 files:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to fetch files from v0'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function determineComponentType(fileName: string, fileType?: string): string {
  if (!fileName) return 'component';
  
  const lowerName = fileName.toLowerCase();
  
  if (lowerName.includes('page') || lowerName.includes('landing')) {
    return 'page';
  }
  if (lowerName.includes('layout')) {
    return 'layout';
  }
  if (lowerName.includes('hook') || lowerName.startsWith('use-')) {
    return 'hook';
  }
  if (lowerName.includes('util') || lowerName.includes('helper')) {
    return 'utility';
  }
  if (lowerName.includes('type') || lowerName.includes('interface')) {
    return 'types';
  }
  if (lowerName.includes('style') || lowerName.endsWith('.css') || lowerName.endsWith('.scss')) {
    return 'styles';
  }
  if (lowerName.includes('config')) {
    return 'config';
  }
  
  return 'component';
}

function determineExportFormat(fileName: string): string {
  if (!fileName) return 'react_tsx';
  
  if (fileName.endsWith('.tsx')) return 'react_tsx';
  if (fileName.endsWith('.jsx')) return 'react_jsx';
  if (fileName.endsWith('.ts')) return 'typescript';
  if (fileName.endsWith('.js')) return 'javascript';
  if (fileName.endsWith('.css')) return 'css';
  if (fileName.endsWith('.scss') || fileName.endsWith('.sass')) return 'scss';
  if (fileName.endsWith('.json')) return 'json';
  
  return 'react_tsx';
}
