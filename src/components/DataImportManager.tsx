import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileSpreadsheet, Database, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';

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
  const { toast } = useToast();

  const parseCSVData = (csvText: string, type: 'campaigns' | 'experiments') => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split('\t').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split('\t');
      const row: any = {};
      
      headers.forEach((header, index) => {
        const value = values[index]?.trim() || '';
        
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
          // Map experiment data fields
          switch (header) {
            case 'Experiment Name':
              row.experiment_name = value;
              break;
            case 'Experiment ID':
              row.experiment_id = value;
              break;
            case 'Owner':
              row.owner = value;
              break;
            case 'Hypothesis':
              row.hypothesis = value;
              break;
            case 'Start Date':
              row.start_date = value;
              break;
            case 'End Date':
              row.end_date = value;
              break;
            case 'Audience Targeted':
              row.audience_targeted = value;
              break;
            case 'Traffic Allocation':
              row.traffic_allocation = value;
              break;
            case 'Sample Size - Control (A)':
              row.sample_size_control = parseInt(value) || 0;
              break;
            case 'Sample Size - Variant (B)':
              row.sample_size_variant = parseInt(value) || 0;
              break;
            case 'Control Description (A)':
              row.control_description = value;
              break;
            case 'Variant Description (B)':
              row.variant_description = value;
              break;
            case 'Primary Metric Measured':
              row.primary_metric = value;
              break;
            case 'Secondary Metrics Measured':
              row.secondary_metrics = value.split(', ');
              break;
            case 'Control Result - Primary Metric':
              row.control_result_primary = parseFloat(value.replace('%', '')) || 0;
              break;
            case 'Variant Result - Primary Metric':
              row.variant_result_primary = parseFloat(value.replace('%', '')) || 0;
              break;
            case 'Delta (Absolute %)':
              row.delta_absolute = parseFloat(value.replace('%', '')) || 0;
              break;
            case 'Uplift (Relative %)':
              row.uplift_relative = parseFloat(value.replace('%', '')) || 0;
              break;
            case 'Statistical Significance Achieved':
              row.statistical_significance = value.toLowerCase() === 'yes';
              break;
            case 'P-Value':
              row.p_value = parseFloat(value) || 0;
              break;
            case 'Winning Variant':
              row.winning_variant = value;
              break;
            case 'Decision Taken':
              row.decision_taken = value;
              break;
            case 'Key Insights and Interpretation':
              row.key_insights = value;
              break;
            case 'Projected Business Impact':
              row.projected_business_impact = value;
              break;
            case 'Limitations & Notes':
              row.limitations_notes = value;
              break;
            case 'Future Recommendations':
              row.future_recommendations = value;
              break;
          }
        }
      });
      
      data.push(row);
    }
    
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

  const sampleData = importType === 'campaigns' 
    ? `Date	Campaign Name	Campaign ID	Landing Page URL	Traffic Source	UTM Source	UTM Medium	Device Type	Creative ID	Creative Name	Creative Type	Sessions	Users	New Users	Bounce Rate (%)	Engagement Rate (%)	Average Time on Page	Scroll Depth (%)	Clicks on Primary CTA	Form Views	Form Starters	Form Completions	Form Abandonment Rate (%)	Primary Conversion Count	Primary Conversion Rate (%)	Secondary Conversions	Cost per Session	Cost per Conversion	Total Spend	Lead-to-SQL Rate (%)	SQL-to-Opportunity Rate (%)	Opportunity-to-Close Rate (%)	Customer Acquisition Cost (CAC)
5/15/2024	Summer Promo Lead Gen	GOOG-2024-SUM-001	https://company.com/summer-promo	Google Paid Search	google	cpc	Desktop	CRT-001-HERO	Hero Banner v2	Image	2847	2234	1789	42.3	58.7	2:34	67.4	487	1203	743	234	68.5	234	8.2	89	4.23	51.5	12051	24.8	42.3	18.7	267.45`
    : `Experiment Name	Experiment ID	Owner	Hypothesis	Start Date	End Date	Audience Targeted	Traffic Allocation	Sample Size - Control (A)	Sample Size - Variant (B)	Control Description (A)	Variant Description (B)	Primary Metric Measured	Secondary Metrics Measured	Control Result - Primary Metric	Variant Result - Primary Metric	Delta (Absolute %)	Uplift (Relative %)	Statistical Significance Achieved	P-Value	Winning Variant	Decision Taken	Key Insights and Interpretation	Projected Business Impact	Limitations & Notes	Future Recommendations
Lead Gen Form Position Test	EXP-2024-FORM-002	Conversion Optimization Team	Placing the lead generation form prominently in the hero section	8/20/2024	9/19/2024	Organic and paid traffic visitors to product landing pages	50/50	15672	15834	Lead generation form positioned in middle section	Lead generation form prominently displayed in hero section	Form Completion Rate	Form Views, Form Starts, Time to Form Interaction	5.83%	7.91%	2.08%	35.70%	Yes	0.0018	B (Hero Form)	Roll out hero form placement	Hero form placement significantly outperformed middle placement	Projected monthly form completions to increase from 4200 to 5700	Test primarily focused on B2B SaaS landing pages	Test different hero form designs`;

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

                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Expected Format (TSV):</h4>
                  <div className="text-xs font-mono bg-background p-2 rounded border overflow-x-auto">
                    <pre>{sampleData}</pre>
                  </div>
                </div>
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

                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Expected Format (TSV):</h4>
                  <div className="text-xs font-mono bg-background p-2 rounded border overflow-x-auto">
                    <pre>{sampleData}</pre>
                  </div>
                </div>
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