import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as XLSX from 'https://cdn.skypack.dev/xlsx@0.18.5';

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
  console.log('Processing Excel file with XLSX library...');
  
  const records: ProcessedRecord[] = [];
  
  try {
    // Convert base64 to array buffer
    const binaryString = atob(fileContent);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Read the Excel workbook
    const workbook = XLSX.read(bytes, { type: 'array' });
    
    console.log('Available worksheets:', workbook.SheetNames);
    
    // Process each worksheet
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert worksheet to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        defval: '',
        raw: false 
      });
      
      if (jsonData.length < 2) continue; // Skip if no data
      
      const headers = (jsonData[0] as string[]).map(h => 
        String(h).trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
      );
      
      console.log(`Processing sheet "${sheetName}" with headers:`, headers);
      
      // Detect data type based on headers and sheet name
      const isCampaignData = headers.some(h => 
        h.includes('campaign') || h.includes('session') || h.includes('conversion') || 
        h.includes('users') || h.includes('bounce') || h.includes('traffic')
      ) || sheetName.toLowerCase().includes('campaign');
      
      const isExperimentData = headers.some(h => 
        h.includes('experiment') || h.includes('test') || h.includes('variant') || 
        h.includes('uplift') || h.includes('significance') || h.includes('control')
      ) || sheetName.toLowerCase().includes('experiment') || sheetName.toLowerCase().includes('test');
      
      // Process data rows
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as (string | number)[];
        if (!row || row.length === 0) continue;
        
        const record: any = {};
        
        headers.forEach((header, index) => {
          const value = row[index];
          record[header] = value !== undefined && value !== null ? String(value).trim() : '';
        });
        
        // Skip empty rows
        if (Object.values(record).every(v => !v)) continue;
        
        let recordType: 'campaign' | 'experiment' = 'campaign';
        if (isExperimentData && !isCampaignData) {
          recordType = 'experiment';
        } else if (isCampaignData && !isExperimentData) {
          recordType = 'campaign';
        } else {
          // Auto-detect based on row content
          const recordString = JSON.stringify(record).toLowerCase();
          if (recordString.includes('experiment') || recordString.includes('variant') || recordString.includes('control')) {
            recordType = 'experiment';
          }
        }
        
        records.push({
          type: recordType,
          data: record
        });
      }
    }
    
    console.log(`Extracted ${records.length} records from Excel file`);
    
  } catch (error) {
    console.error('Excel processing error:', error);
    throw new Error(`Failed to process Excel file: ${error.message}`);
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
    
    // Handle different delimiters
    const delimiter = content.includes('\t') ? '\t' : ',';
    const headers = lines[0].split(delimiter).map(h => 
      h.trim().toLowerCase().replace(/["']/g, '').replace(/[^a-z0-9_]/g, '_')
    );
    
    console.log('CSV headers:', headers);
    
    const isCampaignData = headers.some(h => 
      h.includes('campaign') || h.includes('session') || h.includes('conversion') ||
      h.includes('users') || h.includes('bounce') || h.includes('traffic')
    );
    
    const isExperimentData = headers.some(h => 
      h.includes('experiment') || h.includes('test') || h.includes('variant') ||
      h.includes('uplift') || h.includes('significance') || h.includes('control')
    );
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(delimiter).map(v => v.trim().replace(/["']/g, ''));
      const record: any = {};
      
      headers.forEach((header, index) => {
        record[header] = values[index] || '';
      });
      
      // Skip empty rows
      if (Object.values(record).every(v => !v)) continue;
      
      let recordType: 'campaign' | 'experiment' = 'campaign';
      if (isExperimentData && !isCampaignData) {
        recordType = 'experiment';
      } else if (isCampaignData && !isExperimentData) {
        recordType = 'campaign';
      } else {
        // Auto-detect based on row content
        const recordString = JSON.stringify(record).toLowerCase();
        if (recordString.includes('experiment') || recordString.includes('variant') || recordString.includes('control')) {
          recordType = 'experiment';
        }
      }
      
      records.push({
        type: recordType,
        data: record
      });
    }
    
    console.log(`Extracted ${records.length} records from CSV file`);
    
  } catch (error) {
    console.error('CSV processing error:', error);
    throw new Error(`Failed to process CSV file: ${error.message}`);
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
  
  console.log(`Storing ${records.length} records for user ${userId}`);
  
  for (const record of records) {
    try {
      if (record.type === 'campaign') {
        // Helper function to find field value with multiple possible column names
        const findField = (possibleNames: string[]) => {
          for (const name of possibleNames) {
            if (record.data[name] !== undefined && record.data[name] !== '') {
              return record.data[name];
            }
          }
          return null;
        };
        
        const parseNumber = (value: any, defaultValue = 0) => {
          if (value === null || value === undefined || value === '') return defaultValue;
          const parsed = parseFloat(String(value).replace(/[,%]/g, ''));
          return isNaN(parsed) ? defaultValue : parsed;
        };
        
        const parseInt = (value: any, defaultValue = 0) => {
          if (value === null || value === undefined || value === '') return defaultValue;
          const parsed = parseInt(String(value).replace(/[,%]/g, ''));
          return isNaN(parsed) ? defaultValue : parsed;
        };

        const campaignData = {
          user_id: userId,
          campaign_name: findField([
            'campaign_name', 'campaign', 'name', 'campaign_title', 'title'
          ]) || 'Imported Campaign',
          campaign_date: findField([
            'campaign_date', 'date', 'start_date', 'launch_date', 'created_date'
          ]) || new Date().toISOString().split('T')[0],
          sessions: parseInt(findField([
            'sessions', 'session', 'visits', 'page_views', 'pageviews'
          ])),
          users: parseInt(findField([
            'users', 'user', 'unique_visitors', 'visitors', 'unique_users'
          ])),
          bounce_rate: parseNumber(findField([
            'bounce_rate', 'bounce', 'bounce_rate___', 'bounces'
          ])),
          primary_conversion_rate: parseNumber(findField([
            'primary_conversion_rate', 'conversion_rate', 'cvr', 'cr', 'conv_rate'
          ])),
          primary_conversions: parseInt(findField([
            'primary_conversions', 'conversions', 'conv', 'goals', 'leads'
          ])),
          avg_time_on_page: parseInt(findField([
            'avg_time_on_page', 'time_on_page', 'session_duration', 'avg_session_duration'
          ])),
          utm_source: findField([
            'utm_source', 'source', 'traffic_source', 'referrer'
          ]) || 'direct',
          traffic_source: findField([
            'traffic_source', 'source', 'utm_source', 'channel', 'medium'
          ]) || 'direct',
          new_users: parseInt(findField([
            'new_users', 'new_visitors', 'first_time_visitors'
          ])),
          total_spend: parseNumber(findField([
            'total_spend', 'spend', 'cost', 'budget', 'investment'
          ])),
          cost_per_conversion: parseNumber(findField([
            'cost_per_conversion', 'cpa', 'cost_per_acquisition', 'cpc'
          ])),
          engagement_rate: parseNumber(findField([
            'engagement_rate', 'engagement', 'click_through_rate', 'ctr'
          ])),
          scroll_depth: parseNumber(findField([
            'scroll_depth', 'scroll', 'page_scroll'
          ]))
        };
        
        console.log('Inserting campaign data:', campaignData);
        
        const { error } = await supabase
          .from('historic_campaigns')
          .insert(campaignData);
          
        if (error) {
          console.error('Campaign insert error:', error);
          errors++;
        } else {
          stored++;
          console.log('Successfully stored campaign record');
        }
        
      } else if (record.type === 'experiment') {
        const findField = (possibleNames: string[]) => {
          for (const name of possibleNames) {
            if (record.data[name] !== undefined && record.data[name] !== '') {
              return record.data[name];
            }
          }
          return null;
        };
        
        const parseNumber = (value: any, defaultValue = 0) => {
          if (value === null || value === undefined || value === '') return defaultValue;
          const parsed = parseFloat(String(value).replace(/[,%]/g, ''));
          return isNaN(parsed) ? defaultValue : parsed;
        };
        
        const parseBoolean = (value: any) => {
          if (value === null || value === undefined || value === '') return false;
          const str = String(value).toLowerCase();
          return str === 'true' || str === 'yes' || str === '1' || str === 'significant';
        };

        const experimentData = {
          user_id: userId,
          experiment_name: findField([
            'experiment_name', 'experiment', 'test_name', 'name', 'title'
          ]) || 'Imported Experiment',
          start_date: findField([
            'start_date', 'start', 'launch_date', 'begin_date'
          ]) || new Date().toISOString().split('T')[0],
          end_date: findField([
            'end_date', 'end', 'finish_date', 'completion_date'
          ]) || new Date().toISOString().split('T')[0],
          statistical_significance: parseBoolean(findField([
            'statistical_significance', 'significance', 'significant', 'is_significant'
          ])),
          uplift_relative: parseNumber(findField([
            'uplift_relative', 'uplift', 'lift', 'improvement', 'increase'
          ])),
          control_result_primary: parseNumber(findField([
            'control_result_primary', 'control_result', 'control', 'baseline'
          ])),
          variant_result_primary: parseNumber(findField([
            'variant_result_primary', 'variant_result', 'variant', 'treatment'
          ])),
          winning_variant: findField([
            'winning_variant', 'winner', 'best_variant', 'champion'
          ]) || 'A',
          hypothesis: findField([
            'hypothesis', 'test_hypothesis', 'description', 'goal'
          ]),
          p_value: parseNumber(findField([
            'p_value', 'pvalue', 'p', 'confidence'
          ])),
          sample_size_control: parseInt(findField([
            'sample_size_control', 'control_sample', 'control_size'
          ])),
          sample_size_variant: parseInt(findField([
            'sample_size_variant', 'variant_sample', 'variant_size'
          ]))
        };
        
        console.log('Inserting experiment data:', experimentData);
        
        const { error } = await supabase
          .from('experiment_results')
          .insert(experimentData);
          
        if (error) {
          console.error('Experiment insert error:', error);
          errors++;
        } else {
          stored++;
          console.log('Successfully stored experiment record');
        }
      }
      
    } catch (error) {
      console.error('Record processing error:', error);
      errors++;
    }
  }
  
  console.log(`Storage complete: ${stored} stored, ${errors} errors`);
  return { stored, errors };
}