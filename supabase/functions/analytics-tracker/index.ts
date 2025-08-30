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
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { 
      pageId, 
      eventType, 
      eventData = {}, 
      visitorId, 
      sessionId,
      metadata = {} 
    } = await req.json();

    console.log('Tracking event:', { pageId, eventType, visitorId });

    // Get page info to associate with user
    const { data: page } = await supabaseClient
      .from('generated_pages')
      .select('user_id')
      .eq('id', pageId)
      .single();

    if (!page) {
      throw new Error('Page not found');
    }

    // Track the analytics event
    const { error: trackError } = await supabaseClient
      .from('analytics_events')
      .insert({
        page_id: pageId,
        user_id: page.user_id,
        event_type: eventType,
        event_data: eventData,
        visitor_id: visitorId,
        session_id: sessionId,
        metadata: metadata
      });

    if (trackError) {
      console.error('Tracking error:', trackError);
      throw new Error('Failed to track event');
    }

    // Update aggregated analytics data
    await updateAnalyticsData(supabaseClient, pageId, eventType, eventData);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analytics-tracker function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An unexpected error occurred' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function updateAnalyticsData(supabaseClient: any, pageId: string, eventType: string, eventData: any) {
  const today = new Date().toISOString().split('T')[0];

  // Get existing analytics data for today
  let { data: analyticsData } = await supabaseClient
    .from('analytics_data')
    .select('*')
    .eq('page_id', pageId)
    .eq('date', today)
    .single();

  const updates: any = {};

  // Update metrics based on event type
  switch (eventType) {
    case 'page_view':
      updates.sessions = (analyticsData?.sessions || 0) + 1;
      updates.users = (analyticsData?.users || 0) + 1;
      if (eventData.timeOnPage) {
        updates.avg_time_on_page = Math.round(
          ((analyticsData?.avg_time_on_page || 0) + eventData.timeOnPage) / 2
        );
      }
      break;
    
    case 'cta_click':
      updates.cta_clicks = (analyticsData?.cta_clicks || 0) + 1;
      break;
    
    case 'form_view':
      updates.form_views = (analyticsData?.form_views || 0) + 1;
      break;
    
    case 'form_start':
      updates.form_starts = (analyticsData?.form_starts || 0) + 1;
      break;
    
    case 'form_complete':
      updates.form_completions = (analyticsData?.form_completions || 0) + 1;
      updates.conversions = (analyticsData?.conversions || 0) + 1;
      break;
    
    case 'bounce':
      const currentBounceRate = analyticsData?.bounce_rate || 0;
      const totalSessions = analyticsData?.sessions || 1;
      updates.bounce_rate = ((currentBounceRate * (totalSessions - 1)) + 1) / totalSessions;
      break;
  }

  // Calculate conversion rate
  if (updates.conversions || updates.sessions) {
    const conversions = updates.conversions || analyticsData?.conversions || 0;
    const sessions = updates.sessions || analyticsData?.sessions || 1;
    updates.conversion_rate = conversions / sessions;
  }

  // Upsert analytics data
  if (analyticsData) {
    await supabaseClient
      .from('analytics_data')
      .update(updates)
      .eq('id', analyticsData.id);
  } else {
    // Get page owner for new record
    const { data: page } = await supabaseClient
      .from('generated_pages')
      .select('user_id')
      .eq('id', pageId)
      .single();

    await supabaseClient
      .from('analytics_data')
      .insert({
        ...updates,
        page_id: pageId,
        user_id: page.user_id,
        date: today
      });
  }
}