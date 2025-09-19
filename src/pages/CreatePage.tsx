import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Brain, Sparkles, Target, Users, MessageSquare, Zap, Copy, Database, ExternalLink, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, TrendingUp, Eye, EyeOff } from 'lucide-react';

interface ImportStats {
  total: number;
  imported: number;
  errors: number;
}

const CreatePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const [formData, setFormData] = useState({
    campaignObjective: '',
    targetAudience: '',
    uniqueValueProp: '',
    primaryBenefits: '',
    features: '',
    ctaText: 'Get Started Free',
    toneOfVoice: 'professional',
    industryType: '',
    pageTitle: '',
    seoKeywords: ''
  });
  
  const [importedData, setImportedData] = useState({
    campaigns: [],
    experiments: []
  });

  // Data import states
  const [isImporting, setIsImporting] = useState(false);
  const [importStats, setImportStats] = useState<ImportStats>({ total: 0, imported: 0, errors: 0 });
  const [importType, setImportType] = useState<'campaigns' | 'experiments'>('campaigns');
  const [showFormat, setShowFormat] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Data import functionality
  const parseCSVData = (csvText: string, type: 'campaigns' | 'experiments') => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      console.warn('CSV file must have at least 2 lines (header + data)');
      return [];
    }
    
    const delimiter = csvText.includes('\t') ? '\t' : ',';
    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/["']/g, ''));
    
    console.log(`Detected ${type} headers:`, headers);
    
    const data = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(delimiter).map(v => v.trim().replace(/["']/g, ''));
      
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
          const headerLower = header.toLowerCase().trim();
          if (headerLower.includes('campaign') && headerLower.includes('name')) row.campaign_name = value;
          else if (headerLower.includes('campaign') && headerLower.includes('id')) row.campaign_id = value;
          else if (headerLower.includes('date')) row.campaign_date = value;
          else if (headerLower.includes('session')) row.sessions = parseInt(value) || 0;
          else if (headerLower.includes('user') && !headerLower.includes('new')) row.users = parseInt(value) || 0;
          else if (headerLower.includes('bounce')) row.bounce_rate = parseFloat(value) || 0;
          else if (headerLower.includes('conversion')) row.primary_conversion_rate = parseFloat(value) || 0;
        } else if (type === 'experiments') {
          const headerLower = header.toLowerCase().trim();
          if (headerLower.includes('experiment') && headerLower.includes('name')) row.experiment_name = value;
          else if (headerLower.includes('experiment') && headerLower.includes('id')) row.experiment_id = value;
          else if (headerLower.includes('owner')) row.owner = value;
          else if (headerLower.includes('hypothesis')) row.hypothesis = value;
          else if (headerLower.includes('start') && headerLower.includes('date')) row.start_date = value;
          else if (headerLower.includes('end') && headerLower.includes('date')) row.end_date = value;
          else if (headerLower.includes('control') && headerLower.includes('result')) row.control_result_primary = parseFloat(value.replace(/[%$,]/g, '')) || 0;
          else if (headerLower.includes('variant') && headerLower.includes('result')) row.variant_result_primary = parseFloat(value.replace(/[%$,]/g, '')) || 0;
          else if (headerLower.includes('uplift')) row.uplift_relative = parseFloat(value.replace(/[%$,]/g, '')) || 0;
          else if (headerLower.includes('statistical')) row.statistical_significance = value.toLowerCase().includes('yes');
        }
      });
      
      if (hasValidData) {
        console.log(`Parsed ${type} row ${i}:`, row);
        data.push(row);
      }
    }
    
    console.log(`Successfully parsed ${data.length} ${type} records`);
    return data;
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

      const batchSize = 10;
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        
        for (const item of batch) {
          try {
            item.user_id = user.id;
            
            if (importType === 'experiments' && !item.experiment_name?.trim()) {
              console.error('Missing required field experiment_name:', item);
              errors++;
              continue;
            } else if (importType === 'campaigns' && !item.campaign_name?.trim()) {
              console.error('Missing required field campaign_name:', item);
              errors++;
              continue;
            }
            
            const tableName = importType === 'campaigns' ? 'historic_campaigns' : 'experiment_results';
            const { error } = await supabase.from(tableName).insert(item);

            if (error) {
              console.error(`Database insert error for ${importType}:`, error);
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

      if (imported > 0) {
        const updatedData = { ...importedData };
        updatedData[importType] = data.slice(0, imported);
        setImportedData(updatedData);
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

  const fillExampleData = () => {
    setFormData({
      campaignObjective: 'product-sales',
      targetAudience: 'Creative adults aged 25-55 who enjoy hands-on hobbies, stress relief through art, and personalizing their home decor. Includes beginners looking for a new relaxing hobby, experienced crafters seeking quality materials, parents wanting creative activities with children, and gift-buyers seeking unique presents for artistic friends and family.',
      uniqueValueProp: 'Transform ordinary clay into stunning masterpieces with our premium ceramic pottery and professional-grade paint sets - everything you need for therapeutic crafting and home decoration in one complete kit.',
      primaryBenefits: `• Complete all-in-one ceramic and paint kits - no separate shopping needed
• Therapeutic stress relief through hands-on creativity  
• Create personalized home decor and unique gifts
• High-quality, non-toxic materials safe for all skill levels
• Step-by-step tutorials included for beginners`,
      features: `• Premium air-dry clay that doesn't require kiln firing
• 12-color professional acrylic paint set with brushes
• Sculpting tools and texture stamps included
• Protective finish coat for durability
• Beginner-friendly instruction booklet with 15+ project ideas
• Free online video tutorials and community access`,
      ctaText: 'Start Creating Today - Order Your Kit',
      toneOfVoice: 'friendly',
      industryType: 'Arts & Crafts / Home Decor',
      pageTitle: 'Premium Ceramic Pottery & Paint Sets - Create Beautiful Art at Home',
      seoKeywords: 'ceramic pottery kits, paint and clay sets, home crafting supplies, therapeutic art activities, DIY ceramic painting, beginner pottery tools, creative hobby kits'
    });
    
    toast({
      title: "Example Data Loaded!",
      description: "Ceramic store example has been filled into the form."
    });
  };

  const [generatedPage, setGeneratedPage] = useState<any>(null);
  const [showPagePreview, setShowPagePreview] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if historic data is imported
    if (importedData.campaigns.length === 0 && importedData.experiments.length === 0) {
      toast({
        title: "Historic Data Required",
        description: "Please import your campaign data and experiment results first. This data is essential for AI optimization.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.campaignObjective || !formData.targetAudience || !formData.uniqueValueProp) {
      toast({
        title: "Missing Information",
        description: "Please fill in the campaign objective, target audience, and unique value proposition.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Use autonomous generation for comprehensive AI optimization with historic data
      const requestBody = {
        objective: formData.campaignObjective,
        audience: formData.targetAudience,
        product: {
          name: formData.pageTitle || 'Product',
          valueProposition: formData.uniqueValueProp,
          benefits: formData.primaryBenefits,
          features: formData.features
        },
        branding: {
          tone: formData.toneOfVoice,
          industry: formData.industryType
        },
        cta: formData.ctaText,
        seo: {
          title: formData.pageTitle,
          keywords: formData.seoKeywords
        },
        historicData: {
          campaigns: importedData.campaigns,
          experiments: importedData.experiments
        }
      };

      const { data, error } = await supabase.functions.invoke('autonomous-generation', {
        body: requestBody
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        setGeneratedPage(data);
        setShowPagePreview(true);
        toast({
          title: "Page Generated Successfully!",
          description: "Your AI-optimized landing page with rationale report is ready!"
        });
      } else {
        throw new Error(data.error || 'Failed to generate page');
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate landing page. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeploy = async () => {
    if (!generatedPage?.page) return;
    
    setIsDeploying(true);
    try {
      const { data, error } = await supabase.functions.invoke('deploy-to-vercel', {
        body: {
          pageId: generatedPage.page.id
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Deployment Successful!",
          description: `Your page is now live at ${data.deploymentUrl}`,
        });
      } else {
        throw new Error(data.error || 'Deployment failed');
      }
    } catch (error: any) {
      toast({
        title: "Deployment Failed",
        description: error.message || "Failed to deploy to Vercel",
        variant: "destructive"
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const campaignTypes = [
    { value: 'lead-generation', label: 'Lead Generation' },
    { value: 'product-sales', label: 'Product Sales' },
    { value: 'signup', label: 'User Signup' },
    { value: 'demo-booking', label: 'Demo Booking' },
    { value: 'newsletter', label: 'Newsletter Signup' },
    { value: 'webinar', label: 'Webinar Registration' }
  ];

  const toneOptions = [
    { value: 'professional', label: 'Professional' },
    { value: 'friendly', label: 'Friendly' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'playful', label: 'Playful' },
    { value: 'authoritative', label: 'Authoritative' },
    { value: 'conversational', label: 'Conversational' }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
          <Brain className="h-4 w-4" />
          AI Page Generator
        </div>
        <h1 className="text-3xl font-bold">Create Your Landing Page</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Fill in the details below and let our AI generate a high-converting landing page tailored to your campaign goals and target audience.
        </p>
        <Button 
          type="button"
          variant="outline" 
          onClick={fillExampleData}
          className="mt-4"
        >
          <Copy className="mr-2 h-4 w-4" />
          Copy Example: Ceramic Store with Paint
        </Button>
      </div>

      <form onSubmit={handleGenerate} className="space-y-8">
        {/* Data Import Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              <CardTitle>Historic Data Import (Optional)</CardTitle>
            </div>
            <CardDescription>
              Upload your campaign and experiment data to optimize AI generation with data-driven insights
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <Tabs value={importType} onValueChange={(value) => setImportType(value as 'campaigns' | 'experiments')}>
                <div className="flex items-center justify-between">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="campaigns">Campaign Data</TabsTrigger>
                    <TabsTrigger value="experiments">Experiment Results</TabsTrigger>
                  </TabsList>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFormat(!showFormat)}
                  >
                    {showFormat ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                    {showFormat ? 'Hide' : 'Show'} Format
                  </Button>
                </div>

                <TabsContent value="campaigns" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-center w-full">
                      <label htmlFor="campaign-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-8 h-8 mb-2 text-gray-500" />
                          <p className="mb-2 text-sm text-gray-500">
                            <span className="font-semibold">Click to upload</span> campaign CSV/TSV
                          </p>
                          <p className="text-xs text-gray-500">CSV or TSV files</p>
                        </div>
                        <Input
                          id="campaign-upload"
                          type="file"
                          accept=".csv,.tsv"
                          onChange={handleFileUpload}
                          className="hidden"
                          disabled={isImporting}
                        />
                      </label>
                    </div>

                    {showFormat && (
                      <Card className="bg-blue-50">
                        <CardHeader>
                          <CardTitle className="text-sm">Expected Campaign Data Format</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Campaign Name</TableHead>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Sessions</TableHead>
                                  <TableHead>Users</TableHead>
                                  <TableHead>Conversion Rate (%)</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                <TableRow>
                                  <TableCell>Summer Promo Lead Gen</TableCell>
                                  <TableCell>5/15/2024</TableCell>
                                  <TableCell>2847</TableCell>
                                  <TableCell>2234</TableCell>
                                  <TableCell>8.2</TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="experiments" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-center w-full">
                      <label htmlFor="experiment-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-8 h-8 mb-2 text-gray-500" />
                          <p className="mb-2 text-sm text-gray-500">
                            <span className="font-semibold">Click to upload</span> experiment CSV/TSV
                          </p>
                          <p className="text-xs text-gray-500">CSV or TSV files</p>
                        </div>
                        <Input
                          id="experiment-upload"
                          type="file"
                          accept=".csv,.tsv"
                          onChange={handleFileUpload}
                          className="hidden"
                          disabled={isImporting}
                        />
                      </label>
                    </div>

                    {showFormat && (
                      <Card className="bg-blue-50">
                        <CardHeader>
                          <CardTitle className="text-sm">Expected Experiment Data Format</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Experiment Name</TableHead>
                                  <TableHead>Control Result</TableHead>
                                  <TableHead>Variant Result</TableHead>
                                  <TableHead>Uplift (%)</TableHead>
                                  <TableHead>Statistical Significance</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                <TableRow>
                                  <TableCell>Lead Gen Form Position Test</TableCell>
                                  <TableCell>5.83%</TableCell>
                                  <TableCell>7.91%</TableCell>
                                  <TableCell>35.70%</TableCell>
                                  <TableCell>Yes</TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              {isImporting && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Importing data...</span>
                  </div>
                  <Progress value={(importStats.imported / importStats.total) * 100} />
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <FileSpreadsheet className="h-4 w-4 text-blue-500" />
                      Total: {importStats.total}
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Imported: {importStats.imported}
                    </div>
                    <div className="flex items-center gap-1">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      Errors: {importStats.errors}
                    </div>
                  </div>
                </div>
              )}

              {(importedData.campaigns.length > 0 || importedData.experiments.length > 0) && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Data Imported Successfully</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{importedData.campaigns.length}</div>
                      <div className="text-sm text-blue-600">Campaign Records</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{importedData.experiments.length}</div>
                      <div className="text-sm text-green-600">Experiment Records</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Campaign Strategy */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              <CardTitle>Campaign Strategy</CardTitle>
            </div>
            <CardDescription>
              Define your campaign goals and core messaging
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="objective">Campaign Objective *</Label>
                <Select 
                  value={formData.campaignObjective}
                  onValueChange={(value) => handleInputChange('campaignObjective', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your primary goal" />
                  </SelectTrigger>
                  <SelectContent>
                    {campaignTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry/Category</Label>
                <Input
                  id="industry"
                  placeholder="e.g., SaaS, E-commerce, Healthcare"
                  value={formData.industryType}
                  onChange={(e) => handleInputChange('industryType', e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="pageTitle">Page Title</Label>
              <Input
                id="pageTitle"
                placeholder="Enter a descriptive title for your landing page"
                value={formData.pageTitle}
                onChange={(e) => handleInputChange('pageTitle', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="uvp">Unique Value Proposition *</Label>
              <Textarea
                id="uvp"
                placeholder="What makes your offer unique? How do you solve your customers' main problem?"
                value={formData.uniqueValueProp}
                onChange={(e) => handleInputChange('uniqueValueProp', e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Target Audience */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              <CardTitle>Target Audience</CardTitle>
            </div>
            <CardDescription>
              Describe your ideal customer to create personalized messaging
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="audience">Target Audience Description *</Label>
              <Textarea
                id="audience"
                placeholder="Describe your ideal customer: demographics, job roles, pain points, goals, etc."
                value={formData.targetAudience}
                onChange={(e) => handleInputChange('targetAudience', e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Product/Service Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <CardTitle>Product/Service Details</CardTitle>
            </div>
            <CardDescription>
              Provide information about what you're offering
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="benefits">Primary Benefits</Label>
              <Textarea
                id="benefits"
                placeholder="List the top 3-5 benefits customers get (outcomes, not features)"
                value={formData.primaryBenefits}
                onChange={(e) => handleInputChange('primaryBenefits', e.target.value)}
                className="min-h-[80px]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="features">Key Features</Label>
              <Textarea
                id="features"
                placeholder="List the main features and functionalities of your product/service"
                value={formData.features}
                onChange={(e) => handleInputChange('features', e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Content & Style */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-orange-600" />
              <CardTitle>Content & Style</CardTitle>
            </div>
            <CardDescription>
              Customize the tone and call-to-action for your page
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tone">Tone of Voice</Label>
                <Select 
                  value={formData.toneOfVoice} 
                  onValueChange={(value) => handleInputChange('toneOfVoice', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {toneOptions.map((tone) => (
                      <SelectItem key={tone.value} value={tone.value}>
                        {tone.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cta">Primary CTA Text</Label>
                <Input
                  id="cta"
                  placeholder="e.g., Get Started Free, Book a Demo"
                  value={formData.ctaText}
                  onChange={(e) => handleInputChange('ctaText', e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="keywords">SEO Keywords</Label>
              <Input
                id="keywords"
                placeholder="Enter relevant keywords separated by commas"
                value={formData.seoKeywords}
                onChange={(e) => handleInputChange('seoKeywords', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Generate Button */}
        <div className="flex flex-col items-center space-y-4">
          <Button 
            type="submit" 
            size="lg" 
            disabled={isGenerating}
            className="px-8 py-3 text-lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating Your Page...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-5 w-5" />
                Generate Landing Page
              </>
            )}
          </Button>
          
          <p className="text-sm text-muted-foreground text-center max-w-md">
            This will create an AI-optimized landing page based on your inputs. 
            You can preview and edit it before publishing.
          </p>
        </div>
      </form>

      {/* Page Preview Dialog */}
      <Dialog open={showPagePreview} onOpenChange={setShowPagePreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Generated Landing Page
            </DialogTitle>
            <DialogDescription>
              Your AI-optimized landing page is ready. Review the content and deploy when ready.
            </DialogDescription>
          </DialogHeader>
          
          {generatedPage && (
            <div className="space-y-6">
              {/* Page Preview */}
              <div className="border rounded-lg bg-background">
                <div className="p-4 border-b bg-muted/50">
                  <h3 className="font-semibold">Page Preview</h3>
                  <p className="text-sm text-muted-foreground">
                    Title: {generatedPage.page?.title}
                  </p>
                </div>
                <div className="p-6 max-h-60 overflow-y-auto">
                  {/* Hero Section Preview */}
                  {generatedPage.pageContent?.hero && (
                    <div className="mb-6">
                      <h1 className="text-2xl font-bold mb-2">
                        {generatedPage.pageContent.hero.headline}
                      </h1>
                      <p className="text-muted-foreground mb-4">
                        {generatedPage.pageContent.hero.subheadline}
                      </p>
                      <Button className="mb-4">
                        {generatedPage.pageContent.hero.ctaText}
                      </Button>
                    </div>
                  )}
                  
                  {/* Benefits Preview */}
                  {generatedPage.pageContent?.benefits && (
                    <div className="mb-4">
                      <h2 className="text-xl font-semibold mb-3">Benefits</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {generatedPage.pageContent.benefits.items?.slice(0, 4).map((benefit: any, index: number) => (
                          <div key={index} className="p-3 border rounded">
                            <h3 className="font-medium text-sm">{benefit.title}</h3>
                            <p className="text-xs text-muted-foreground">{benefit.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Rationale Summary */}
              {generatedPage.aiRationale && (
                <div className="border rounded-lg">
                  <div className="p-4 border-b bg-muted/50">
                    <h3 className="font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      AI Rationale Report
                    </h3>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong>Key Decisions:</strong>
                        <ul className="mt-1 space-y-1">
                          {Object.entries(generatedPage.aiRationale.keyDecisions || {}).slice(0, 3).map(([key, value]: [string, any]) => (
                            <li key={key} className="text-muted-foreground">
                              • {key}: {value.decision}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <strong>Performance Insights:</strong>
                        <p className="mt-1 text-muted-foreground">
                          {generatedPage.aiRationale.performanceInsights?.summary || 'Optimized based on historical data'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Component Exports Info */}
              {generatedPage.componentExports && generatedPage.componentExports.length > 0 && (
                <div className="border rounded-lg">
                  <div className="p-4 border-b bg-muted/50">
                    <h3 className="font-semibold">Sitecore Components Generated</h3>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      {generatedPage.componentExports.length} exportable components created
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {generatedPage.componentExports.map((component: any, index: number) => (
                        <Badge key={index} variant="secondary">
                          {component.component_name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => generatedPage?.page && navigate(`/dashboard/pages/${generatedPage.page.id}`)}
            >
              <Eye className="h-4 w-4 mr-2" />
              Open Editor
            </Button>
            <Button
              onClick={handleDeploy}
              disabled={isDeploying}
            >
              {isDeploying ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              Deploy to Vercel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreatePage;