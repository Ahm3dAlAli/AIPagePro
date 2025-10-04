import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Database, TrendingUp, Target, Zap } from 'lucide-react';
import { useDataImport, ImportedData } from '@/hooks/useDataImport';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
interface EnhancedDataImportProps {
  onDataImported?: (data: ImportedData) => void;
}
interface DataImportRef {
  processFiles: () => Promise<{
    success: boolean;
    processedRecords?: number;
    error?: string;
  }>;
  hasFiles: () => boolean;
}
const EnhancedDataImport = React.forwardRef<DataImportRef, EnhancedDataImportProps>(({
  onDataImported
}, ref) => {
  const {
    isImporting,
    importStats,
    importData,
    loadImportedData
  } = useDataImport();
  const {
    toast
  } = useToast();
  const [importedData, setImportedData] = useState<ImportedData>({
    campaigns: [],
    experiments: []
  });
  const [activeTab, setActiveTab] = useState('campaigns');
  const [uploadedFiles, setUploadedFiles] = useState<{
    campaigns?: File;
    experiments?: File;
  }>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Data is now loaded only when explicitly uploaded/processed
  // No automatic loading from database

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
    setUploadedFiles(prev => ({
      ...prev,
      [type]: file
    }));
    toast({
      title: "File Selected",
      description: `${file.name} selected for ${type}. It will be automatically processed when you generate a landing page.`
    });

    // Clear the input
    event.target.value = '';
  };

  // Export function to process files (used by landing page generation)
  const processUploadedFiles = async () => {
    if (!uploadedFiles.campaigns && !uploadedFiles.experiments) {
      return {
        success: false,
        error: "No files to process"
      };
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
      for (const {
        file,
        type
      } of filesToProcess) {
        const fileContent = await fileToBase64(file);
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        let fileType = 'csv';
        if (['xlsx', 'xls'].includes(fileExtension || '')) {
          fileType = 'excel';
        } else if (['jpg', 'jpeg', 'png', 'pdf'].includes(fileExtension || '')) {
          fileType = 'image';
        }
        console.log('Auto-processing file for landing page generation:', {
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
        if (response.data?.stored) {
          processedRecords += response.data.stored;
        }
      }
      await loadExistingData();
      setUploadedFiles({});
      return {
        success: true,
        processedRecords
      };
    } catch (error) {
      console.error('File processing error:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    } finally {
      setIsProcessing(false);
    }
  };

  // Expose processing function to parent
  React.useImperativeHandle(ref, () => ({
    processFiles: processUploadedFiles,
    hasFiles: () => !!(uploadedFiles.campaigns || uploadedFiles.experiments)
  }), [uploadedFiles]);
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
    const {
      campaigns,
      experiments
    } = importedData;

    // Only show insights if we have actual imported data
    if (!campaigns || !experiments || campaigns.length === 0 && experiments.length === 0) {
      return null;
    }
    const avgConversionRate = campaigns.length > 0 ? campaigns.reduce((sum, c) => sum + (parseFloat(c.primary_conversion_rate) || 0), 0) / campaigns.length : 0;
    const significantExperiments = experiments.filter(e => e.statistical_significance === true || e.statistical_significance === 'true').length;
    const topPerformingCampaign = campaigns.length > 0 ? campaigns.reduce((best, current) => (parseFloat(current.primary_conversion_rate) || 0) > (parseFloat(best.primary_conversion_rate) || 0) ? current : best) : null;
    return {
      totalCampaigns: campaigns.length,
      totalExperiments: experiments.length,
      avgConversionRate: avgConversionRate.toFixed(1),
      significantExperiments,
      topPerformingCampaign,
      readyForAI: campaigns.length >= 5 || campaigns.length >= 2 && experiments.length >= 2
    };
  };
  const insights = getInsights();
  return <div className="space-y-6">
      {/* AI Readiness Alert */}
      {insights && <Alert className={insights.readyForAI ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
          <div className="flex items-center gap-2">
            {insights.readyForAI ? <CheckCircle className="h-5 w-5 text-green-600" /> : <AlertCircle className="h-5 w-5 text-yellow-600" />}
            <AlertDescription className={insights.readyForAI ? 'text-green-800' : 'text-yellow-800'}>
              {insights.readyForAI ? 'Your data is ready for AI-powered landing page generation! The system has enough historical data to provide optimized recommendations.' : `Import more data to enable AI optimization. Current: ${insights.totalCampaigns} campaigns, ${insights.totalExperiments} experiments. Recommended: 5+ campaigns or 2+ campaigns with 2+ experiments.`}
            </AlertDescription>
          </div>
        </Alert>}

      {/* Data Overview Cards */}
      {insights && <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
        </div>}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="campaigns">Campaign Data</TabsTrigger>
          <TabsTrigger value="experiments">Experiment Results</TabsTrigger>
        </TabsList>
        
        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              
              
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="campaigns-file">Upload CSV File</Label>
                <Input id="campaigns-file" type="file" accept=".csv,.xlsx,.xls,.css,.jpg,.jpeg,.png,.pdf" onChange={e => handleFileUpload(e, 'campaigns')} disabled={isProcessing} />
                {uploadedFiles.campaigns && <div className="text-sm text-green-600">
                    ✓ {uploadedFiles.campaigns.name} selected
                  </div>}
              </div>
              
              {isProcessing && <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Processing files...</span>
                    <span>Please wait...</span>
                  </div>
                  <Progress value={50} />
                </div>}
              
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
            
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="experiments-file">Upload CSV File</Label>
                <Input id="experiments-file" type="file" accept=".csv,.xlsx,.xls,.css,.jpg,.jpeg,.png,.pdf" onChange={e => handleFileUpload(e, 'experiments')} disabled={isProcessing} />
                {uploadedFiles.experiments && <div className="text-sm text-green-600">
                    ✓ {uploadedFiles.experiments.name} selected
                  </div>}
              </div>
              
              {isProcessing && <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Processing files...</span>
                    <span>Please wait...</span>
                  </div>
                  <Progress value={50} />
                </div>}
              
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

      {/* Files Ready Status */}
      {(uploadedFiles.campaigns || uploadedFiles.experiments) && <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
              <div>
                <p className="font-medium text-blue-900">Files Ready for AI Landing Page Generation</p>
                <p className="text-sm text-blue-700">
                  {uploadedFiles.campaigns && uploadedFiles.experiments ? 'Campaign and experiment data will be automatically processed when you generate a landing page' : uploadedFiles.campaigns ? 'Campaign data will be automatically processed when you generate a landing page' : 'Experiment data will be automatically processed when you generate a landing page'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>}
    </div>;
});
EnhancedDataImport.displayName = 'EnhancedDataImport';
export default EnhancedDataImport;