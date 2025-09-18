import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileSpreadsheet, Database, CheckCircle, AlertCircle, TrendingUp, Eye, EyeOff } from 'lucide-react';

interface ImportStats {
  total: number;
  imported: number;
  errors: number;
}

interface DataImportManagerProps {
  onDataImported?: (data: { campaigns: any[]; experiments: any[] }) => void;
}

const DataImportManager: React.FC<DataImportManagerProps> = ({ onDataImported }) => {
  const [importedData, setImportedData] = useState<{ campaigns: any[]; experiments: any[] }>({
    campaigns: [],
    experiments: []
  });
  const [isImporting, setIsImporting] = useState(false);
  const [importStats, setImportStats] = useState<ImportStats>({ total: 0, imported: 0, errors: 0 });
  const [importType, setImportType] = useState<'campaigns' | 'experiments'>('campaigns');
  const [showFormat, setShowFormat] = useState(false);
  const { toast } = useToast();

  const parseCSVData = (csvText: string, type: 'campaigns' | 'experiments') => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      console.warn('CSV file must have at least 2 lines (header + data)');
      return [];
    }
    
    // Handle both comma and tab delimiters
    const delimiter = csvText.includes('\t') ? '\t' : ',';
    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/["']/g, ''));
    
    // Log detected headers for debugging
    console.log(`Detected ${type} headers:`, headers);
    
    const data = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines
      
      const values = line.split(delimiter).map(v => v.trim().replace(/["']/g, ''));
      
      // Validate row has minimum required columns
      if (values.length < Math.min(headers.length, 3)) {
        errors.push(`Row ${i + 1}: Insufficient data columns`);
        continue;
      }
      
      const row: any = {};
      let hasValidData = false;
      
      headers.forEach((header, index) => {
        const value = values[index]?.trim() || '';
        if (value && value !== 'N/A' && value !== '-') {
          hasValidData = true;
        }
        
        if (type === 'campaigns') {
          // Map campaign data fields
          switch (header) {
            case 'Date':
              row.campaign_date = value;
              break;
            case 'Campaign Name':
              row.campaign_name = value;
              break;
            case 'Campaign ID':
              row.campaign_id = value;
              break;
            case 'Landing Page URL':
              row.landing_page_url = value;
              break;
            case 'Traffic Source':
              row.traffic_source = value;
              break;
            case 'UTM Source':
              row.utm_source = value;
              break;
            case 'UTM Medium':
              row.utm_medium = value;
              break;
            case 'Device Type':
              row.device_type = value;
              break;
            case 'Creative ID':
              row.creative_id = value;
              break;
            case 'Creative Name':
              row.creative_name = value;
              break;
            case 'Creative Type':
              row.creative_type = value;
              break;
            case 'Sessions':
              row.sessions = parseInt(value) || 0;
              break;
            case 'Users':
              row.users = parseInt(value) || 0;
              break;
            case 'New Users':
              row.new_users = parseInt(value) || 0;
              break;
            case 'Bounce Rate (%)':
              row.bounce_rate = parseFloat(value) || 0;
              break;
            case 'Engagement Rate (%)':
              row.engagement_rate = parseFloat(value) || 0;
              break;
            case 'Average Time on Page':
              row.avg_time_on_page = convertTimeToSeconds(value);
              break;
            case 'Scroll Depth (%)':
              row.scroll_depth = parseFloat(value) || 0;
              break;
            case 'Clicks on Primary CTA':
              row.primary_cta_clicks = parseInt(value) || 0;
              break;
            case 'Form Views':
              row.form_views = parseInt(value) || 0;
              break;
            case 'Form Starters':
              row.form_starters = parseInt(value) || 0;
              break;
            case 'Form Completions':
              row.form_completions = parseInt(value) || 0;
              break;
            case 'Form Abandonment Rate (%)':
              row.form_abandonment_rate = parseFloat(value) || 0;
              break;
            case 'Primary Conversion Count':
              row.primary_conversions = parseInt(value) || 0;
              break;
            case 'Primary Conversion Rate (%)':
              row.primary_conversion_rate = parseFloat(value) || 0;
              break;
            case 'Secondary Conversions':
              row.secondary_conversions = parseInt(value) || 0;
              break;
            case 'Cost per Session':
              row.cost_per_session = parseFloat(value) || 0;
              break;
            case 'Cost per Conversion':
              row.cost_per_conversion = parseFloat(value) || 0;
              break;
            case 'Total Spend':
              row.total_spend = parseFloat(value) || 0;
              break;
            case 'Lead-to-SQL Rate (%)':
              row.lead_to_sql_rate = parseFloat(value) || 0;
              break;
            case 'SQL-to-Opportunity Rate (%)':
              row.sql_to_opportunity_rate = parseFloat(value) || 0;
              break;
            case 'Opportunity-to-Close Rate (%)':
              row.opportunity_to_close_rate = parseFloat(value) || 0;
              break;
            case 'Customer Acquisition Cost (CAC)':
              row.customer_acquisition_cost = parseFloat(value) || 0;
              break;
          }
        } else if (type === 'experiments') {
          // Map experiment data fields - flexible header matching
          const headerLower = header.toLowerCase().trim();
          
          // Experiment Name variations
          if (headerLower.includes('experiment') && headerLower.includes('name') || 
              headerLower.includes('test') && headerLower.includes('name') ||
              headerLower === 'name') {
            row.experiment_name = value;
          }
          // Experiment ID variations  
          else if (headerLower.includes('experiment') && headerLower.includes('id') ||
                   headerLower.includes('test') && headerLower.includes('id') ||
                   headerLower === 'id') {
            row.experiment_id = value;
          }
          // Owner variations
          else if (headerLower.includes('owner') || headerLower.includes('creator')) {
            row.owner = value;
          }
          // Hypothesis variations
          else if (headerLower.includes('hypothesis')) {
            row.hypothesis = value;
          }
          // Start Date variations
          else if (headerLower.includes('start') && headerLower.includes('date')) {
            row.start_date = value;
          }
          // End Date variations
          else if (headerLower.includes('end') && headerLower.includes('date')) {
            row.end_date = value;
          }
          // Audience variations
          else if (headerLower.includes('audience') || headerLower.includes('target')) {
            row.audience_targeted = value;
          }
          // Traffic allocation variations
          else if (headerLower.includes('traffic') || headerLower.includes('split')) {
            row.traffic_allocation = value;
          }
          // Control sample size variations
          else if ((headerLower.includes('sample') || headerLower.includes('size')) && 
                   (headerLower.includes('control') || headerLower.includes('(a)'))) {
            row.sample_size_control = parseInt(value) || 0;
          }
          // Variant sample size variations
          else if ((headerLower.includes('sample') || headerLower.includes('size')) && 
                   (headerLower.includes('variant') || headerLower.includes('(b)'))) {
            row.sample_size_variant = parseInt(value) || 0;
          }
          // Control description variations
          else if (headerLower.includes('control') && headerLower.includes('description')) {
            row.control_description = value;
          }
          // Variant description variations
          else if (headerLower.includes('variant') && headerLower.includes('description')) {
            row.variant_description = value;
          }
          // Primary metric variations
          else if (headerLower.includes('primary') && headerLower.includes('metric')) {
            row.primary_metric = value;
          }
          // Secondary metrics variations
          else if (headerLower.includes('secondary') && headerLower.includes('metric')) {
            row.secondary_metrics = value ? value.split(/[,;]/).map(s => s.trim()) : [];
          }
          // Control result variations
          else if (headerLower.includes('control') && headerLower.includes('result')) {
            row.control_result_primary = parseFloat(value.replace(/[%$,]/g, '')) || 0;
          }
          // Variant result variations
          else if (headerLower.includes('variant') && headerLower.includes('result')) {
            row.variant_result_primary = parseFloat(value.replace(/[%$,]/g, '')) || 0;
          }
          // Delta variations
          else if (headerLower.includes('delta') || headerLower.includes('difference')) {
            row.delta_absolute = parseFloat(value.replace(/[%$,]/g, '')) || 0;
          }
          // Uplift variations
          else if (headerLower.includes('uplift') || headerLower.includes('lift')) {
            row.uplift_relative = parseFloat(value.replace(/[%$,]/g, '')) || 0;
          }
          // Statistical significance variations
          else if (headerLower.includes('statistical') || headerLower.includes('significant')) {
            row.statistical_significance = value.toLowerCase().includes('yes') || 
                                         value.toLowerCase().includes('true') ||
                                         value.toLowerCase().includes('significant');
          }
          // P-value variations
          else if (headerLower.includes('p-value') || headerLower.includes('pvalue')) {
            row.p_value = parseFloat(value) || 0;
          }
          // Winning variant variations
          else if (headerLower.includes('winning') || headerLower.includes('winner')) {
            row.winning_variant = value;
          }
          // Decision variations
          else if (headerLower.includes('decision')) {
            row.decision_taken = value;
          }
          // Insights variations
          else if (headerLower.includes('insight') || headerLower.includes('interpretation')) {
            row.key_insights = value;
          }
          // Business impact variations
          else if (headerLower.includes('business') && headerLower.includes('impact')) {
            row.projected_business_impact = value;
          }
          // Limitations variations
          else if (headerLower.includes('limitation') || headerLower.includes('notes')) {
            row.limitations_notes = value;
          }
          // Recommendations variations
          else if (headerLower.includes('recommendation') || headerLower.includes('future')) {
            row.future_recommendations = value;
          }
        }
      });
      
      // Only add row if it contains valid data
      if (hasValidData) {
        // Log parsed row for debugging
        console.log(`Parsed ${type} row ${i}:`, row);
        data.push(row);
      } else {
        errors.push(`Row ${i + 1}: No valid data found`);
      }
    }
    
    // Log parsing summary
    if (errors.length > 0) {
      console.warn(`Parsing completed with ${errors.length} errors:`, errors);
    }
    console.log(`Successfully parsed ${data.length} ${type} records`);
    
    return data;
  };

  const convertTimeToSeconds = (timeStr: string): number => {
    if (!timeStr || timeStr === 'N/A') return 0;
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return 0;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStats({ total: 0, imported: 0, errors: 0 });

    try {
      const text = await file.text();
      const data = parseCSVData(text, importType);
      
      setImportStats(prev => ({ ...prev, total: data.length }));

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Error",
          description: "Please log in to import data",
          variant: "destructive"
        });
        return;
      }

      let imported = 0;
      let errors = 0;

      // Import data in batches
      const batchSize = 10;
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        
        for (const item of batch) {
          try {
            item.user_id = user.id;
            
            const tableName = importType === 'campaigns' ? 'historic_campaigns' : 'experiment_results';
            const { error } = await supabase
              .from(tableName)
              .insert(item);

            if (error) {
              console.error('Insert error:', error);
              errors++;
            } else {
              imported++;
            }
          } catch (err) {
            console.error('Processing error:', err);
            errors++;
          }
          
          setImportStats({ total: data.length, imported, errors });
        }
      }

      toast({
        title: "Import Complete",
        description: `Successfully imported ${imported} ${importType} records with ${errors} errors`,
        variant: imported > 0 ? "default" : "destructive"
      });

      // Update local state and notify parent
      if (imported > 0) {
        const updatedData = { ...importedData };
        updatedData[importType] = data.slice(0, imported);
        setImportedData(updatedData);
        
        // Notify parent component if callback is provided
        if (onDataImported) {
          onDataImported(updatedData);
        }
      }

    } catch (error) {
      console.error('File processing error:', error);
      toast({
        title: "Import Failed",
        description: "Failed to process the uploaded file",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  const campaignHeaders = ['Date', 'Campaign Name', 'Campaign ID', 'Landing Page URL', 'Traffic Source', 'UTM Source', 'UTM Medium', 'Device Type', 'Sessions', 'Users', 'Bounce Rate (%)', 'Conversion Rate (%)'];
  const campaignSampleRow = ['5/15/2024', 'Summer Promo Lead Gen', 'GOOG-2024-SUM-001', 'https://company.com/summer-promo', 'Google Paid Search', 'google', 'cpc', 'Desktop', '2847', '2234', '42.3', '8.2'];

  const experimentHeaders = ['Experiment Name', 'Experiment ID', 'Owner', 'Hypothesis', 'Start Date', 'End Date', 'Sample Size - Control (A)', 'Sample Size - Variant (B)', 'Control Result - Primary Metric', 'Variant Result - Primary Metric', 'Uplift (Relative %)', 'Statistical Significance'];
  const experimentSampleRow = ['Lead Gen Form Position Test', 'EXP-2024-FORM-002', 'Conversion Optimization Team', 'Placing the lead generation form prominently in the hero section', '8/20/2024', '9/19/2024', '15672', '15834', '5.83%', '7.91%', '35.70%', 'Yes'];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Import Manager
          </CardTitle>
          <CardDescription>
            Import historic campaign data and experiment results to enhance AI-driven landing page generation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={importType} onValueChange={(value) => setImportType(value as 'campaigns' | 'experiments')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="campaigns" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Campaign Data
              </TabsTrigger>
              <TabsTrigger value="experiments" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Experiment Results
              </TabsTrigger>
            </TabsList>

            <TabsContent value="campaigns" className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="campaign-upload">Upload Campaign Data (TSV/CSV)</Label>
                  <Input
                    id="campaign-upload"
                    type="file"
                    accept=".csv,.tsv,.txt"
                    onChange={handleFileUpload}
                    disabled={isImporting}
                    className="mt-2"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Upload tab-separated file with campaign performance metrics
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Expected Format (TSV):</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFormat(!showFormat)}
                    className="flex items-center gap-2"
                  >
                    {showFormat ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {showFormat ? 'Hide Format' : 'Show Format'}
                  </Button>
                </div>
                
                {showFormat && (
                  <div className="mt-4 border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {campaignHeaders.map((header, index) => (
                            <TableHead key={index} className="text-xs whitespace-nowrap">
                              {header}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          {campaignSampleRow.map((cell, index) => (
                            <TableCell key={index} className="text-xs">
                              {cell}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableBody>
                    </Table>
                    <div className="p-2 bg-muted text-xs text-muted-foreground">
                      Note: This is a sample showing key columns. The full format includes all campaign metrics and creative details.
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="experiments" className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="experiment-upload">Upload Experiment Results (TSV/CSV)</Label>
                  <Input
                    id="experiment-upload"
                    type="file"
                    accept=".csv,.tsv,.txt"
                    onChange={handleFileUpload}
                    disabled={isImporting}
                    className="mt-2"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Upload tab-separated file with A/B test experiment results
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Expected Format (TSV):</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFormat(!showFormat)}
                    className="flex items-center gap-2"
                  >
                    {showFormat ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {showFormat ? 'Hide Format' : 'Show Format'}
                  </Button>
                </div>
                
                {showFormat && (
                  <div className="mt-4 border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {experimentHeaders.map((header, index) => (
                            <TableHead key={index} className="text-xs whitespace-nowrap">
                              {header}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          {experimentSampleRow.map((cell, index) => (
                            <TableCell key={index} className="text-xs">
                              {cell}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableBody>
                    </Table>
                    <div className="p-2 bg-muted text-xs text-muted-foreground">
                      Note: This is a sample showing key columns. The full format includes all experiment metrics and results.
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {isImporting && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 animate-pulse" />
                <span>Importing {importType}...</span>
              </div>
              <Progress 
                value={importStats.total > 0 ? ((importStats.imported + importStats.errors) / importStats.total) * 100 : 0} 
                className="w-full"
              />
              <div className="flex gap-4 text-sm">
                <Badge variant="outline">
                  Total: {importStats.total}
                </Badge>
                <Badge variant="default">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Imported: {importStats.imported}
                </Badge>
                {importStats.errors > 0 && (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Errors: {importStats.errors}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DataImportManager;