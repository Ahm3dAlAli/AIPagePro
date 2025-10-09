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
    console.log('Processing form submission');
    
    const { formData, formType, pageId, config } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Log the submission to analytics
    try {
      await supabaseClient
        .from('analytics_events')
        .insert({
          page_id: pageId || 'unknown',
          user_id: '00000000-0000-0000-0000-000000000000',
          event_type: 'form_submission',
          event_data: {
            formType: formType || 'contact',
            fields: Object.keys(formData),
            timestamp: new Date().toISOString()
          }
        });
    } catch (analyticsError) {
      console.error('Analytics logging failed:', analyticsError);
    }

    // Store submission in a generic submissions table
    try {
      const { error: saveError } = await supabaseClient
        .from('form_submissions')
        .insert({
          page_id: pageId,
          form_type: formType || 'contact',
          form_data: formData,
          submitted_at: new Date().toISOString()
        });

      if (saveError && saveError.code !== '42P01') { // Ignore if table doesn't exist
        console.error('Failed to save submission:', saveError);
      }
    } catch (saveError) {
      console.log('Form submissions table not found, skipping storage');
    }

    // Send email notification if configured
    if (config?.sendEmail && config?.emailTo) {
      const resendKey = Deno.env.get('RESEND_API_KEY');
      if (resendKey) {
        try {
          const emailBody = Object.entries(formData)
            .map(([key, value]) => `<p><strong>${key}:</strong> ${value}</p>`)
            .join('\n');

          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: 'noreply@resend.dev',
              to: config.emailTo,
              subject: `New ${formType || 'Contact'} Form Submission`,
              html: `
                <h2>New Form Submission</h2>
                <p><strong>Page ID:</strong> ${pageId}</p>
                <p><strong>Submitted:</strong> ${new Date().toISOString()}</p>
                <hr/>
                ${emailBody}
              `
            })
          });
        } catch (emailError) {
          console.error('Email sending failed:', emailError);
        }
      }
    }

    // Call webhook if configured
    if (config?.webhookUrl) {
      try {
        await fetch(config.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pageId,
            formType,
            formData,
            submittedAt: new Date().toISOString()
          })
        });
      } catch (webhookError) {
        console.error('Webhook call failed:', webhookError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Form submitted successfully',
        submittedAt: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Form submission error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
