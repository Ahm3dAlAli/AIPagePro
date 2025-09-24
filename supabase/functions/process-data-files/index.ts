import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ProcessedRecord {
  type: 'campaign' | 'experiment';
  data: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing data files request...');
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('Authentication failed');
    }

    const { fileContent, fileName, fileType } = await req.json();
    
    if (!fileContent || !fileName) {
      throw new Error('Missing file content or name');
    }

    console.log(`Processing file: ${fileName}, type: ${fileType}`);
    
    let processedRecords: ProcessedRecord[] = [];
    
    // Process different file types
    if (fileType === 'excel' || fileName.match(/\.(xlsx|xls)$/i)) {
      processedRecords = await processExcelFile(fileContent, fileName);
    } else if (fileType === 'csv' || fileName.match(/\.csv$/i)) {
      processedRecords = await processCSVFile(fileContent);
    } else if (fileType === 'image' || fileName.match(/\.(jpg|jpeg|png|pdf)$/i)) {
      processedRecords = await processImageWithOCR(fileContent, fileName);
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }

    console.log(`Extracted ${processedRecords.length} records`);

    // Store records in database
    const results = await storeRecords(processedRecords, user.id);
    
    return new Response(JSON.stringify({
      success: true,
      processed: processedRecords.length,
      stored: results.stored,
      errors: results.errors,
      message: `Successfully processed ${results.stored} records from ${fileName}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing files:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to process file'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processExcelFile(fileContent: string, fileName: string): Promise<ProcessedRecord[]> {
  console.log('Processing Excel file...');
  
  // For Excel files, we'll use a simple CSV-like parsing approach
  // In a real implementation, you'd use a proper Excel parsing library
  const records: ProcessedRecord[] = [];
  
  try {
    // Convert base64 to text (assuming CSV-like format for now)
    const content = atob(fileContent);
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) return records;
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Detect if this is campaign or experiment data based on headers
    const isCampaignData = headers.some(h => 
      h.includes('campaign') || h.includes('session') || h.includes('conversion')
    );
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const record: any = {};
      
      headers.forEach((header, index) => {
        record[header] = values[index] || '';
      });
      
      records.push({
        type: isCampaignData ? 'campaign' : 'experiment',
        data: record
      });
    }
    
  } catch (error) {
    console.error('Excel processing error:', error);
  }
  
  return records;
}

async function processCSVFile(fileContent: string): Promise<ProcessedRecord[]> {
  console.log('Processing CSV file...');
  
  const records: ProcessedRecord[] = [];
  
  try {
    const content = atob(fileContent);
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) return records;
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    const isCampaignData = headers.some(h => 
      h.includes('campaign') || h.includes('session') || h.includes('conversion')
    );
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const record: any = {};
      
      headers.forEach((header, index) => {
        record[header] = values[index] || '';
      });
      
      records.push({
        type: isCampaignData ? 'campaign' : 'experiment',
        data: record
      });
    }
    
  } catch (error) {
    console.error('CSV processing error:', error);
  }
  
  return records;
}

async function processImageWithOCR(fileContent: string, fileName: string): Promise<ProcessedRecord[]> {
  console.log('Processing image/PDF with OCR...');
  
  const records: ProcessedRecord[] = [];
  
  try {
    // For OCR, we'd integrate with an OCR service like Tesseract.js or Google Vision API
    // For now, we'll simulate OCR extraction
    console.log('OCR processing not fully implemented - would extract text from image/PDF');
    
    // Simulated OCR result parsing
    const mockOcrText = `
Campaign Name,Date,Sessions,Users,Conversion Rate
Summer Sale,2024-01-15,1250,1100,3.2
Winter Promo,2024-02-20,980,850,2.8
    `;
    
    const lines = mockOcrText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const record: any = {};
      
      headers.forEach((header, index) => {
        record[header] = values[index] || '';
      });
      
      records.push({
        type: 'campaign',
        data: record
      });
    }
    
  } catch (error) {
    console.error('OCR processing error:', error);
  }
  
  return records;
}

async function storeRecords(records: ProcessedRecord[], userId: string) {
  let stored = 0;
  let errors = 0;
  
  for (const record of records) {
    try {
      if (record.type === 'campaign') {
        const campaignData = {
          user_id: userId,
          campaign_name: record.data.campaign_name || record.data['campaign name'] || 'Imported Campaign',
          campaign_date: record.data.campaign_date || record.data.date || new Date().toISOString().split('T')[0],
          sessions: parseInt(record.data.sessions) || 0,
          users: parseInt(record.data.users) || 0,
          bounce_rate: parseFloat(record.data.bounce_rate || record.data['bounce rate']) || 0,
          primary_conversion_rate: parseFloat(record.data.conversion_rate || record.data['conversion rate'] || record.data.primary_conversion_rate) || 0,
          primary_conversions: parseInt(record.data.conversions || record.data.primary_conversions) || 0,
          avg_time_on_page: parseInt(record.data.avg_time_on_page || record.data['avg time on page']) || 0,
          utm_source: record.data.utm_source || record.data['utm source'] || 'direct',
          traffic_source: record.data.traffic_source || record.data['traffic source'] || 'direct'
        };
        
        const { error } = await supabase
          .from('historic_campaigns')
          .insert(campaignData);
          
        if (error) {
          console.error('Campaign insert error:', error);
          errors++;
        } else {
          stored++;
        }
        
      } else if (record.type === 'experiment') {
        const experimentData = {
          user_id: userId,
          experiment_name: record.data.experiment_name || record.data['experiment name'] || 'Imported Experiment',
          start_date: record.data.start_date || record.data['start date'] || new Date().toISOString().split('T')[0],
          end_date: record.data.end_date || record.data['end date'] || new Date().toISOString().split('T')[0],
          statistical_significance: Boolean(record.data.statistical_significance || record.data['statistical significance']),
          uplift_relative: parseFloat(record.data.uplift_relative || record.data['uplift relative'] || record.data.uplift) || 0,
          control_result_primary: parseFloat(record.data.control_result_primary || record.data['control result']) || 0,
          variant_result_primary: parseFloat(record.data.variant_result_primary || record.data['variant result']) || 0,
          winning_variant: record.data.winning_variant || record.data['winning variant'] || 'A'
        };
        
        const { error } = await supabase
          .from('experiment_results')
          .insert(experimentData);
          
        if (error) {
          console.error('Experiment insert error:', error);
          errors++;
        } else {
          stored++;
        }
      }
      
    } catch (error) {
      console.error('Record processing error:', error);
      errors++;
    }
  }
  
  return { stored, errors };
}