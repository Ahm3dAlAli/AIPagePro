import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle, 
  Database,
  TrendingUp,
  Target,
  Zap
} from 'lucide-react';
import { useDataImport, ImportedData } from '@/hooks/useDataImport';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EnhancedDataImportProps {
  onDataImported?: (data: ImportedData) => void;
}

const EnhancedDataImport: React.FC<EnhancedDataImportProps> = ({ onDataImported }) => {
  const { isImporting, importStats, importData, loadImportedData } = useDataImport();
  const { toast } = useToast();
  const [importedData, setImportedData] = useState<ImportedData>({ campaigns: [], experiments: [] });
  const [activeTab, setActiveTab] = useState('campaigns');
  const [uploadedFiles, setUploadedFiles] = useState<{campaigns?: File, experiments?: File}>({});
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadExistingData();
  }, []);

  const loadExistingData = async () => {
    const data = await loadImportedData();
    setImportedData(data);
    onDataImported?.(data);
  };

  const parseCSV = (csvText: string): any[] => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    const delimiter = csvText.includes('\t') ? '\t' : ',';
    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/["']/g, ''));
    
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(delimiter).map(v => v.trim().replace(/["']/g, ''));
      const row: any = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      data.push(row);
    }
    
    return data;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, type: 'campaigns' | 'experiments') => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('File selected:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      type: type
    });

    setUploadedFiles(prev => ({ ...prev, [type]: file }));
    
    toast({
      title: "File Selected",
      description: `${file.name} selected for ${type}. Click 'Process Files' to import data.`,
    });

    // Clear the input
    event.target.value = '';
  };

  const processUploadedFiles = async () => {
    if (!uploadedFiles.campaigns && !uploadedFiles.experiments) {
      toast({
        title: "No Files Selected",
        description: "Please select at least one file to process.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    let processedRecords = 0;

    try {
      const filesToProcess = [];
      
      if (uploadedFiles.campaigns) {
        filesToProcess.push({
          file: uploadedFiles.campaigns,
          type: 'campaigns'
        });
      }
      
      if (uploadedFiles.experiments) {
        filesToProcess.push({
          file: uploadedFiles.experiments,
          type: 'experiments'
        });
      }

      for (const { file, type } of filesToProcess) {
        const fileContent = await fileToBase64(file);
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        
        let fileType = 'csv';
        if (['xlsx', 'xls'].includes(fileExtension || '')) {
          fileType = 'excel';
        } else if (['jpg', 'jpeg', 'png', 'pdf'].includes(fileExtension || '')) {
          fileType = 'image';
        }

        console.log('Processing file via edge function:', {
          fileName: file.name,
          fileType,
          dataType: type
        });

        const response = await supabase.functions.invoke('process-data-files', {
          body: {
            fileContent,
            fileName: file.name,
            fileType,
            dataType: type
          }
        });

        if (!response.data?.success) {
          throw new Error(response.data?.error || response.error?.message || `Failed to process ${file.name}`);
        }

        console.log('Successfully processed:', response.data);
        
        // Track total processed records
        if (response.data?.stored) {
          processedRecords += response.data.stored;
        }
      }

      toast({
        title: "Processing Complete!",
        description: `Files processed successfully. ${processedRecords} records imported.`,
      });

      await loadExistingData();
      setUploadedFiles({});
      
      // Refresh the page to show updated metrics
      window.location.reload();
      
    } catch (error) {
      console.error('File processing error:', error);
      toast({
        title: "Processing Failed",
        description: (error as Error).message,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data URL prefix
      };
      reader.onerror = error => reject(error);
    });
  };

  const getInsights = () => {
    const { campaigns, experiments } = importedData;
    
    // Only show insights if we have actual imported data
    if (!campaigns || !experiments || (campaigns.length === 0 && experiments.length === 0)) {
      return null;
    }

    const avgConversionRate = campaigns.length > 0 
      ? campaigns.reduce((sum, c) => sum + (parseFloat(c.primary_conversion_rate) || 0), 0) / campaigns.length 
      : 0;
    
    const significantExperiments = experiments.filter(e => e.statistical_significance === true || e.statistical_significance === 'true').length;
    
    const topPerformingCampaign = campaigns.length > 0 
      ? campaigns.reduce((best, current) => 
          (parseFloat(current.primary_conversion_rate) || 0) > (parseFloat(best.primary_conversion_rate) || 0) ? current : best
        )
      : null;

    return {
      totalCampaigns: campaigns.length,
      totalExperiments: experiments.length,
      avgConversionRate: avgConversionRate.toFixed(1),
      significantExperiments,
      topPerformingCampaign,
      readyForAI: campaigns.length >= 5 || (campaigns.length >= 2 && experiments.length >= 2)
    };
  };

  const insights = getInsights();

  return (
    <div className="space-y-6">
      {/* AI Readiness Alert */}
      {insights && (
        <Alert className={insights.readyForAI ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
          <div className="flex items-center gap-2">
            {insights.readyForAI ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            )}
            <AlertDescription className={insights.readyForAI ? 'text-green-800' : 'text-yellow-800'}>
              {insights.readyForAI 
                ? 'Your data is ready for AI-powered landing page generation! The system has enough historical data to provide optimized recommendations.'
                : `Import more data to enable AI optimization. Current: ${insights.totalCampaigns} campaigns, ${insights.totalExperiments} experiments. Recommended: 5+ campaigns or 2+ campaigns with 2+ experiments.`
              }
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Data Overview Cards */}
      {insights && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Campaigns</p>
                  <p className="text-2xl font-bold">{insights.totalCampaigns}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Avg CVR</p>
                  <p className="text-2xl font-bold">{insights.avgConversionRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm text-muted-foreground">A/B Tests</p>
                  <p className="text-2xl font-bold">{insights.totalExperiments}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm text-muted-foreground">AI Ready</p>
                  <p className="text-2xl font-bold">{insights.readyForAI ? '✓' : '×'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="campaigns">Campaign Data</TabsTrigger>
          <TabsTrigger value="experiments">Experiment Results</TabsTrigger>
        </TabsList>
        
        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Import Campaign Data
              </CardTitle>
              <CardDescription>
                Upload your historical campaign performance data. This data will be used by AI to optimize your landing pages.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="campaigns-file">Upload CSV File</Label>
                <Input
                  id="campaigns-file"
                  type="file"
                  accept=".csv,.xlsx,.xls,.css,.jpg,.jpeg,.png,.pdf"
                  onChange={(e) => handleFileUpload(e, 'campaigns')}
                  disabled={isProcessing}
                />
                {uploadedFiles.campaigns && (
                  <div className="text-sm text-green-600">
                    ✓ {uploadedFiles.campaigns.name} selected
                  </div>
                )}
              </div>
              
              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Processing files...</span>
                    <span>Please wait...</span>
                  </div>
                  <Progress value={50} />
                </div>
              )}
              
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-2">Supported formats:</p>
                <ul className="list-disc list-inside space-y-1 mb-3">
                  <li>CSV files (.csv)</li>
                  <li><strong>Excel files (.xlsx, .xls)</strong> - Automatically processed via AI</li>
                  <li>CSS files with embedded analytics (.css)</li>
                  <li>Images with OCR (.jpg, .png, .pdf)</li>
                </ul>
                <p className="font-medium mb-2">Recommended columns (flexible naming):</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li><strong>Campaign/Product Name:</strong> "Campaign Name", "Product / Service Name", etc.</li>
                  <li><strong>Date:</strong> "Date", "Campaign Date", etc.</li>
                  <li><strong>Traffic:</strong> "Sessions", "Users", "New Users", etc.</li>
                  <li><strong>Performance:</strong> "Conversion Rate", "Primary Conversion KPI", etc.</li>
                  <li><strong>Engagement:</strong> "Bounce Rate", "Avg Time on Page", etc.</li>
                  <li><strong>Source:</strong> "Traffic Source", "UTM Source", etc.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="experiments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Import A/B Test Results
              </CardTitle>
              <CardDescription>
                Upload your A/B test and experiment results. This helps AI understand what optimizations work best.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="experiments-file">Upload CSV File</Label>
                <Input
                  id="experiments-file"
                  type="file"
                  accept=".csv,.xlsx,.xls,.css,.jpg,.jpeg,.png,.pdf"
                  onChange={(e) => handleFileUpload(e, 'experiments')}
                  disabled={isImporting}
                />
              </div>
              
              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Processing files...</span>
                    <span>Please wait...</span>
                  </div>
                  <Progress value={50} />
                </div>
              )}
              
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-2">Supported formats:</p>
                <ul className="list-disc list-inside space-y-1 mb-3">
                  <li>CSV files (.csv)</li>
                  <li>Excel files (.xlsx, .xls)</li>
                  <li>CSS files with embedded analytics (.css)</li>
                  <li>Images with OCR (.jpg, .png, .pdf)</li>
                </ul>
                <p className="font-medium mb-2">Required columns:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Experiment Name</li>
                  <li>Start Date</li>
                  <li>End Date</li>
                  <li>Winning Variant</li>
                  <li>Uplift (Relative %)</li>
                  <li>Statistical Significance</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Process Button */}
      <div className="flex justify-center mt-6">
        <Button 
          onClick={processUploadedFiles}
          disabled={isProcessing || (!uploadedFiles.campaigns && !uploadedFiles.experiments)}
          className="px-8 py-2"
        >
          {isProcessing ? 'Processing Files...' : 'Process Files'}
        </Button>
      </div>
    </div>
  );
};

export default EnhancedDataImport;