import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Database, TrendingUp, Target, Zap, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
interface CampaignDataImportProps {
  onDataImported?: (data: {
    campaigns: any[];
    experiments: any[];
  }) => void;
}
interface ImportInsights {
  avgConversionRate?: string;
  totalSpend?: string;
  avgCostPerConversion?: string;
  topSource?: string;
  totalCampaigns?: number;
  totalExperiments?: number;
  significantTests?: number;
  avgUplift?: string;
  winRate?: string;
  recommendation?: string;
}
export const CampaignDataImport: React.FC<CampaignDataImportProps> = ({
  onDataImported
}) => {
  const {
    toast
  } = useToast();
  const [activeTab, setActiveTab] = useState('campaigns');
  const [uploadedFiles, setUploadedFiles] = useState<{
    campaigns?: File;
    experiments?: File;
  }>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [insights, setInsights] = useState<ImportInsights | null>(null);
  const campaignFileInputRef = useRef<HTMLInputElement>(null);
  const experimentFileInputRef = useRef<HTMLInputElement>(null);
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, type: 'campaigns' | 'experiments') => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!validExtensions.includes(fileExtension)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a CSV or Excel file (.csv, .xlsx, .xls)",
        variant: "destructive"
      });
      return;
    }
    setUploadedFiles(prev => ({
      ...prev,
      [type]: file
    }));
    toast({
      title: "File Selected",
      description: `${file.name} ready for processing`
    });

    // Clear the input
    event.target.value = '';
  };
  const processFile = async (file: File, dataType: 'campaigns' | 'experiments') => {
    const fileReader = new FileReader();
    return new Promise<{
      success: boolean;
      insights?: ImportInsights;
      stored?: number;
    }>((resolve, reject) => {
      fileReader.onload = async () => {
        try {
          const base64Content = (fileReader.result as string).split(',')[1];
          const fileExtension = file.name.split('.').pop()?.toLowerCase();
          let fileType = 'csv';
          if (fileExtension === 'xlsx' || fileExtension === 'xls') {
            fileType = 'excel';
          }
          const response = await supabase.functions.invoke('process-campaign-data', {
            body: {
              fileContent: base64Content,
              fileName: file.name,
              fileType,
              dataType
            }
          });
          if (response.error) {
            throw new Error(response.error.message);
          }
          if (!response.data?.success) {
            throw new Error(response.data?.error || 'Processing failed');
          }
          resolve({
            success: true,
            insights: response.data.insights,
            stored: response.data.stored
          });
        } catch (error) {
          reject(error);
        }
      };
      fileReader.onerror = () => reject(new Error('Failed to read file'));
      fileReader.readAsDataURL(file);
    });
  };
  const handleProcessFiles = async () => {
    if (!uploadedFiles.campaigns && !uploadedFiles.experiments) {
      toast({
        title: "No Files Selected",
        description: "Please select at least one file to process",
        variant: "destructive"
      });
      return;
    }
    setIsProcessing(true);
    setProcessingProgress(0);
    try {
      const filesToProcess = [];
      if (uploadedFiles.campaigns) filesToProcess.push({
        file: uploadedFiles.campaigns,
        type: 'campaigns' as const
      });
      if (uploadedFiles.experiments) filesToProcess.push({
        file: uploadedFiles.experiments,
        type: 'experiments' as const
      });
      let totalStored = 0;
      let combinedInsights: ImportInsights = {};
      for (let i = 0; i < filesToProcess.length; i++) {
        const {
          file,
          type
        } = filesToProcess[i];
        toast({
          title: "Processing",
          description: `Processing ${type} data from ${file.name}...`
        });
        setProcessingProgress((i + 0.5) / filesToProcess.length * 100);
        const result = await processFile(file, type);
        if (result.success) {
          totalStored += result.stored || 0;
          combinedInsights = {
            ...combinedInsights,
            ...result.insights
          };
        }
        setProcessingProgress((i + 1) / filesToProcess.length * 100);
      }
      setInsights(combinedInsights);
      setUploadedFiles({});
      toast({
        title: "Processing Complete!",
        description: `Successfully processed and stored ${totalStored} records. View insights below.`
      });

      // Notify parent component
      onDataImported?.({
        campaigns: [],
        experiments: []
      });
    } catch (error: any) {
      console.error('Processing error:', error);
      toast({
        title: "Processing Failed",
        description: error.message || "Failed to process files. Please check the format and try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  };
  return <div className="space-y-6">
      {/* Insights Display */}
      {insights && <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <AlertDescription className="text-green-800">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
              {insights.totalCampaigns && <div>
                  <p className="text-xs font-medium">Campaigns</p>
                  <p className="text-lg font-bold">{insights.totalCampaigns}</p>
                </div>}
              {insights.avgConversionRate && <div>
                  <p className="text-xs font-medium">Avg CVR</p>
                  <p className="text-lg font-bold">{insights.avgConversionRate}</p>
                </div>}
              {insights.totalExperiments && <div>
                  <p className="text-xs font-medium">A/B Tests</p>
                  <p className="text-lg font-bold">{insights.totalExperiments}</p>
                </div>}
              {insights.avgUplift && <div>
                  <p className="text-xs font-medium">Avg Uplift</p>
                  <p className="text-lg font-bold">{insights.avgUplift}</p>
                </div>}
            </div>
            {insights.recommendation && <p className="mt-3 text-sm font-medium">💡 {insights.recommendation}</p>}
          </AlertDescription>
        </Alert>}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="campaigns">Campaign Data</TabsTrigger>
          <TabsTrigger value="experiments">A/B Test Results</TabsTrigger>
        </TabsList>
        
        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                <FileSpreadsheet className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <Input ref={campaignFileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={e => handleFileSelect(e, 'campaigns')} className="hidden" disabled={isProcessing} />
                <Button onClick={() => campaignFileInputRef.current?.click()} variant="outline" disabled={isProcessing}>
                  <Upload className="h-4 w-4 mr-2" />
                  Select Campaign File
                </Button>
                {uploadedFiles.campaigns && <div className="mt-3 flex items-center justify-center gap-2 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    {uploadedFiles.campaigns.name}
                  </div>}
              </div>
              
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-2">Expected columns (flexible names):</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Campaign Name, Date</li>
                  <li>Sessions, Users, Conversions</li>
                  <li>Conversion Rate, Bounce Rate</li>
                  <li>Spend, Cost per Conversion</li>
                  <li>UTM Source, Traffic Source</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="experiments" className="space-y-4">
          <Card>
            
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors">
                <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <Input ref={experimentFileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={e => handleFileSelect(e, 'experiments')} className="hidden" disabled={isProcessing} />
                <Button onClick={() => experimentFileInputRef.current?.click()} variant="outline" disabled={isProcessing}>
                  <Upload className="h-4 w-4 mr-2" />
                  Select Experiment File
                </Button>
                {uploadedFiles.experiments && <div className="mt-3 flex items-center justify-center gap-2 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    {uploadedFiles.experiments.name}
                  </div>}
              </div>
              
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-2">Expected columns:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Experiment Name, Hypothesis</li>
                  <li>Start Date, End Date</li>
                  <li>Control/Variant Results</li>
                  <li>Uplift %, Statistical Significance</li>
                  <li>Winning Variant, Sample Sizes</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Processing Status */}
      {isProcessing && <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Processing files...</span>
                <span>{Math.round(processingProgress)}%</span>
              </div>
              <Progress value={processingProgress} />
            </div>
          </CardContent>
        </Card>}

      {/* Process Button */}
      {(uploadedFiles.campaigns || uploadedFiles.experiments) && !isProcessing && <div className="flex justify-end">
          <Button onClick={handleProcessFiles} size="lg" className="bg-blue-600 hover:bg-blue-700">
            <Zap className="h-4 w-4 mr-2" />
            Process & Generate Insights
          </Button>
        </div>}
    </div>;
};
export default CampaignDataImport;