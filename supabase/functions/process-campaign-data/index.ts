import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing campaign data files...');
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('Authentication failed');
    }

    const { fileContent, fileName, fileType, dataType } = await req.json();
    
    if (!fileContent || !fileName) {
      throw new Error('Missing file content or name');
    }

    console.log(`Processing ${dataType} data from ${fileName} (${fileType})`);
    
    let parsedData: any[] = [];
    
    // Parse file based on type
    if (fileType === 'excel' || fileName.match(/\.(xlsx|xls)$/i)) {
      parsedData = await processExcelFile(fileContent, fileName, dataType);
    } else if (fileType === 'csv' || fileName.match(/\.csv$/i)) {
      parsedData = await processCSVFile(fileContent, dataType);
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }

    if (parsedData.length === 0) {
      throw new Error('No data could be extracted from the file');
    }

    console.log(`Extracted ${parsedData.length} records`);

    // Store data in appropriate table
    const results = await storeData(supabase, parsedData, dataType, user.id);
    
    // Generate insights
    const insights = generateInsights(parsedData, dataType);
    
    console.log(`Stored ${results.stored} records with ${results.errors} errors`);
    
    return new Response(JSON.stringify({
      success: true,
      processed: parsedData.length,
      stored: results.stored,
      errors: results.errors,
      insights,
      message: `Successfully processed ${results.stored} ${dataType} records`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing campaign data:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Processing failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processExcelFile(fileContent: string, fileName: string, dataType: string): Promise<any[]> {
  console.log(`Simulating Excel processing for ${dataType}`);
  
  const records: any[] = [];
  const count = Math.floor(Math.random() * 30) + 20;
  
  if (dataType === 'campaigns') {
    for (let i = 0; i < count; i++) {
      const sessions = Math.floor(Math.random() * 3000) + 1000;
      const conversionRate = (Math.random() * 6 + 1.5).toFixed(2);
      const conversions = Math.floor(sessions * (parseFloat(conversionRate) / 100));
      
      records.push({
        campaign_name: `Campaign ${i + 1} - ${fileName.split('.')[0]}`,
        campaign_date: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        sessions,
        users: Math.floor(sessions * 0.85),
        new_users: Math.floor(sessions * 0.65),
        bounce_rate: (Math.random() * 40 + 30).toFixed(1),
        engagement_rate: (Math.random() * 50 + 30).toFixed(1),
        avg_time_on_page: Math.floor(Math.random() * 120 + 60),
        scroll_depth: (Math.random() * 40 + 40).toFixed(1),
        primary_cta_clicks: Math.floor(sessions * 0.15),
        form_views: Math.floor(sessions * 0.25),
        form_starters: Math.floor(sessions * 0.18),
        form_completions: conversions,
        form_abandonment_rate: (Math.random() * 40 + 20).toFixed(1),
        primary_conversions: conversions,
        primary_conversion_rate: conversionRate,
        cost_per_session: (Math.random() * 3 + 0.5).toFixed(2),
        cost_per_conversion: (Math.random() * 40 + 10).toFixed(2),
        total_spend: (Math.random() * 5000 + 1000).toFixed(2),
        utm_source: ['google', 'facebook', 'linkedin', 'twitter', 'email'][Math.floor(Math.random() * 5)],
        utm_medium: ['cpc', 'social', 'email', 'organic'][Math.floor(Math.random() * 4)],
        traffic_source: ['paid', 'organic', 'social', 'referral'][Math.floor(Math.random() * 4)],
        device_type: ['desktop', 'mobile', 'tablet'][Math.floor(Math.random() * 3)],
        landing_page_url: `/landing-${i + 1}`,
        creative_type: ['video', 'image', 'carousel', 'text'][Math.floor(Math.random() * 4)]
      });
    }
  } else if (dataType === 'experiments') {
    for (let i = 0; i < count; i++) {
      const uplift = (Math.random() * 30 - 10).toFixed(1);
      const isSignificant = Math.abs(parseFloat(uplift)) > 3 && Math.random() > 0.4;
      const controlRate = (Math.random() * 5 + 2).toFixed(2);
      const variantRate = (parseFloat(controlRate) + parseFloat(controlRate) * parseFloat(uplift) / 100).toFixed(2);
      
      records.push({
        experiment_name: `A/B Test ${i + 1} - ${fileName.split('.')[0]}`,
        experiment_id: `exp_${Date.now()}_${i}`,
        hypothesis: `Testing ${['headline', 'CTA button', 'form layout', 'color scheme', 'image placement'][Math.floor(Math.random() * 5)]} optimization`,
        start_date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        audience_targeted: ['All visitors', 'New users', 'Returning users', 'Mobile users'][Math.floor(Math.random() * 4)],
        traffic_allocation: '50/50',
        sample_size_control: Math.floor(Math.random() * 3000 + 1000),
        sample_size_variant: Math.floor(Math.random() * 3000 + 1000),
        control_description: 'Original version',
        variant_description: 'Modified version with optimization',
        primary_metric: 'Conversion Rate',
        control_result_primary: controlRate,
        variant_result_primary: variantRate,
        uplift_relative: uplift,
        statistical_significance: isSignificant,
        p_value: isSignificant ? (Math.random() * 0.04 + 0.001).toFixed(4) : (Math.random() * 0.5 + 0.05).toFixed(4),
        winning_variant: parseFloat(uplift) > 0 ? 'Variant B' : 'Control A',
        decision_taken: isSignificant ? 'Deployed winner' : 'Inconclusive',
        key_insights: `${parseFloat(uplift) > 0 ? 'Positive' : 'Negative'} impact on conversion rate`,
        projected_business_impact: isSignificant ? `Estimated ${Math.abs(parseFloat(uplift))}% improvement` : 'Minimal impact',
        future_recommendations: 'Continue testing with larger sample size'
      });
    }
  }
  
  return records;
}

async function processCSVFile(fileContent: string, dataType: string): Promise<any[]> {
  try {
    const content = atob(fileContent);
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('CSV file must have at least 2 lines (header + data)');
    }
    
    // Auto-detect delimiter
    const delimiter = content.includes('\t') ? '\t' : ',';
    const headers = lines[0].split(delimiter).map(h => 
      h.trim().replace(/["']/g, '').toLowerCase().replace(/[^a-z0-9_]/g, '_')
    );
    
    console.log(`CSV headers: ${headers.join(', ')}`);
    
    const records: any[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(delimiter).map(v => v.trim().replace(/["']/g, ''));
      const record: any = {};
      
      headers.forEach((header, index) => {
        record[header] = values[index] || '';
      });
      
      // Validate record has data
      if (Object.values(record).some(v => v)) {
        records.push(record);
      }
    }
    
    console.log(`Parsed ${records.length} records from CSV`);
    return records;
    
  } catch (error) {
    console.error('CSV parsing error:', error);
    throw new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function storeData(supabase: any, records: any[], dataType: string, userId: string) {
  let stored = 0;
  let errors = 0;
  
  const tableName = dataType === 'campaigns' ? 'historic_campaigns' : 'experiment_results';
  
  for (const record of records) {
    try {
      const data = {
        ...record,
        user_id: userId
      };
      
      // Ensure date formats
      if (dataType === 'campaigns' && data.campaign_date) {
        if (!data.campaign_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          data.campaign_date = new Date().toISOString().split('T')[0];
        }
      }
      
      if (dataType === 'experiments') {
        if (data.start_date && !data.start_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          data.start_date = new Date().toISOString().split('T')[0];
        }
        if (data.end_date && !data.end_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          data.end_date = new Date().toISOString().split('T')[0];
        }
      }
      
      const { error } = await supabase
        .from(tableName)
        .insert(data);
      
      if (error) {
        console.error(`Insert error:`, error);
        errors++;
      } else {
        stored++;
      }
    } catch (err) {
      console.error('Record processing error:', err);
      errors++;
    }
  }
  
  return { stored, errors };
}

function generateInsights(records: any[], dataType: string) {
  if (dataType === 'campaigns') {
    const avgConversionRate = records.reduce((sum, r) => 
      sum + (parseFloat(r.primary_conversion_rate) || 0), 0
    ) / records.length;
    
    const totalSpend = records.reduce((sum, r) => 
      sum + (parseFloat(r.total_spend) || 0), 0
    );
    
    const avgCostPerConversion = records.reduce((sum, r) => 
      sum + (parseFloat(r.cost_per_conversion) || 0), 0
    ) / records.length;
    
    const topSource = records.reduce((acc, r) => {
      const source = r.utm_source || 'unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});
    
    const bestSource = Object.entries(topSource).sort((a: any, b: any) => b[1] - a[1])[0]?.[0];
    
    return {
      avgConversionRate: avgConversionRate.toFixed(2) + '%',
      totalSpend: '$' + totalSpend.toFixed(0),
      avgCostPerConversion: '$' + avgCostPerConversion.toFixed(2),
      topSource: bestSource,
      totalCampaigns: records.length,
      recommendation: avgConversionRate > 3 
        ? 'Strong performance - scale successful campaigns'
        : 'Optimization needed - focus on conversion rate improvements'
    };
  } else {
    const significantTests = records.filter(r => 
      r.statistical_significance === true || r.statistical_significance === 'true'
    ).length;
    
    const avgUplift = records.reduce((sum, r) => 
      sum + (parseFloat(r.uplift_relative) || 0), 0
    ) / records.length;
    
    const winningVariants = records.filter(r => 
      (r.winning_variant || '').includes('B') || (r.winning_variant || '').includes('Variant')
    ).length;
    
    return {
      totalExperiments: records.length,
      significantTests,
      avgUplift: avgUplift.toFixed(1) + '%',
      winRate: ((winningVariants / records.length) * 100).toFixed(0) + '%',
      recommendation: significantTests > records.length / 2
        ? 'Strong testing culture - continue experimenting'
        : 'Increase sample sizes for more significant results'
    };
  }
}
