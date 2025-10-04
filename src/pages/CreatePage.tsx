import { useState } from 'react';
import React from 'react';
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
import EnhancedDataImport from '@/components/EnhancedDataImport';
import { ImportedData } from '@/hooks/useDataImport';
interface DataImportRef {
  processFiles: () => Promise<{
    success: boolean;
    processedRecords?: number;
    error?: string;
  }>;
  hasFiles: () => boolean;
}
const CreatePage = () => {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
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
  const [importedData, setImportedData] = useState<ImportedData>({
    campaigns: [],
    experiments: []
  });
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const handleDataImported = (data: ImportedData) => {
    setImportedData(data);
    toast({
      title: "Data Ready for AI",
      description: `Imported ${data.campaigns.length} campaigns and ${data.experiments.length} experiments. Ready for optimized generation!`
    });
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
  const [generationStep, setGenerationStep] = useState<'idle' | 'prd' | 'components' | 'complete'>('idle');
  const [prdDocument, setPrdDocument] = useState<any>(null);
  const dataImportRef = React.useRef<DataImportRef>(null);
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.campaignObjective || !formData.targetAudience || !formData.uniqueValueProp) {
      toast({
        title: "Missing Information",
        description: "Please fill in the campaign objective, target audience, and unique value proposition.",
        variant: "destructive"
      });
      return;
    }
    setIsGenerating(true);
    setGenerationStep('idle');
    try {
      // Auto-process uploaded files if they exist
      if (dataImportRef.current?.hasFiles()) {
        toast({
          title: "Processing Data Files",
          description: "Automatically processing your uploaded data for AI optimization..."
        });
        const processResult = await dataImportRef.current.processFiles();
        if (processResult.success) {
          toast({
            title: "Data Processed Successfully",
            description: `${processResult.processedRecords} records processed and ready for AI optimization.`
          });
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          console.warn('File processing warning:', processResult.error);
        }
      }

      // STEP 1: Generate PRD and Engineering Prompt
      setGenerationStep('prd');
      toast({
        title: "Step 1/2: Generating PRD",
        description: "Creating product requirements document based on your data..."
      });
      const campaignConfig = {
        campaignObjective: formData.campaignObjective,
        primaryConversionKPI: formData.campaignObjective,
        targetAudience: formData.targetAudience,
        productServiceName: formData.pageTitle || 'Our Product',
        primaryOffer: formData.uniqueValueProp,
        uniqueValueProp: formData.uniqueValueProp,
        topBenefits: formData.primaryBenefits.split('\n').filter(b => b.trim()),
        featureList: formData.features.split('\n').filter(f => f.trim()),
        emotionalTriggers: ['innovation', 'trust', 'value'],
        testimonials: [],
        trustIndicators: ['Secure', 'Trusted', 'Verified'],
        primaryCtaText: formData.ctaText,
        toneOfVoice: formData.toneOfVoice,
        brandColorPalette: ['#3b82f6', '#1e40af', '#60a5fa'],
        fontStyleGuide: 'Modern sans-serif',
        targetSeoKeywords: formData.seoKeywords.split(',').map(k => k.trim()).filter(k => k)
      };
      const {
        data: prdData,
        error: prdError
      } = await supabase.functions.invoke('generate-prd-prompt', {
        body: {
          campaignConfig
        }
      });
      if (prdError) throw prdError;
      if (!prdData.success) {
        throw new Error('Failed to generate PRD');
      }
      setPrdDocument(prdData);
      toast({
        title: "PRD Generated Successfully!",
        description: `Based on ${prdData.historicDataSummary.campaignCount} campaigns and ${prdData.historicDataSummary.experimentCount} experiments.`
      });

      // STEP 2: Generate v0 Components
      setGenerationStep('components');
      toast({
        title: "Step 2/2: Generating Components",
        description: "Using v0 API to create production-ready React components with Shadcn UI..."
      });
      const {
        data: v0Data,
        error: v0Error
      } = await supabase.functions.invoke('generate-v0-app', {
        body: {
          engineeringPrompt: prdData.engineeringPrompt,
          prdDocument: prdData.prdDocument,
          campaignConfig
        }
      });
      if (v0Error) throw v0Error;
      if (!v0Data.success) {
        throw new Error('Failed to generate v0 components');
      }

      // Combine all data for preview
      const completePageData = {
        success: true,
        page: {
          id: crypto.randomUUID(),
          title: formData.pageTitle || 'Generated Landing Page',
          slug: `v0-page-${Date.now()}`,
          content: {
            v0Data: v0Data.v0Data,
            prdDocument: prdData.prdDocument,
            engineeringPrompt: prdData.engineeringPrompt,
            campaignConfig
          }
        },
        rationale: prdData.prdDocument,
        v0Components: v0Data.v0Data
      };
      setGeneratedPage(completePageData);
      setGenerationStep('complete');
      setShowPagePreview(true);
      toast({
        title: "🎉 Page Generated Successfully!",
        description: "Your production-ready landing page is ready with v0 components!"
      });
    } catch (error: any) {
      console.error('Generation error:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate landing page. Please try again.",
        variant: "destructive"
      });
      setGenerationStep('idle');
    } finally {
      setIsGenerating(false);
    }
  };
  const handleDeploy = async () => {
    if (!generatedPage?.page) return;
    setIsDeploying(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('deploy-to-vercel', {
        body: {
          pageId: generatedPage.page.id
        }
      });
      if (error) throw error;
      if (data.success) {
        toast({
          title: "Deployment Successful!",
          description: `Your page is now live at ${data.deploymentUrl}`
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
  const campaignTypes = [{
    value: 'lead-generation',
    label: 'Lead Generation'
  }, {
    value: 'product-sales',
    label: 'Product Sales'
  }, {
    value: 'signup',
    label: 'User Signup'
  }, {
    value: 'demo-booking',
    label: 'Demo Booking'
  }, {
    value: 'newsletter',
    label: 'Newsletter Signup'
  }, {
    value: 'webinar',
    label: 'Webinar Registration'
  }];
  const toneOptions = [{
    value: 'professional',
    label: 'Professional'
  }, {
    value: 'friendly',
    label: 'Friendly'
  }, {
    value: 'urgent',
    label: 'Urgent'
  }, {
    value: 'playful',
    label: 'Playful'
  }, {
    value: 'authoritative',
    label: 'Authoritative'
  }, {
    value: 'conversational',
    label: 'Conversational'
  }];
  return <div className="max-w-4xl mx-auto p-6 space-y-8">
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
        <Button type="button" variant="outline" onClick={fillExampleData} className="mt-4">
          <Copy className="mr-2 h-4 w-4" />
          Copy Example: Ceramic Store with Paint
        </Button>
      </div>

      <form onSubmit={handleGenerate} className="space-y-8">
        {/* Enhanced Data Import Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              <CardTitle>Historic Data for AI Optimization</CardTitle>
            </div>
            
          </CardHeader>
          <CardContent>
            <EnhancedDataImport ref={dataImportRef} onDataImported={handleDataImported} />
          </CardContent>
        </Card>

        {/* Campaign Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-600" />
              <CardTitle>Campaign Configuration</CardTitle>
            </div>
            <CardDescription>
              Define your campaign goals and target audience for optimal page generation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="campaignObjective">Campaign Objective *</Label>
                <Select value={formData.campaignObjective} onValueChange={value => handleInputChange('campaignObjective', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select campaign type" />
                  </SelectTrigger>
                  <SelectContent>
                    {campaignTypes.map(type => <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="toneOfVoice">Tone of Voice</Label>
                <Select value={formData.toneOfVoice} onValueChange={value => handleInputChange('toneOfVoice', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {toneOptions.map(tone => <SelectItem key={tone.value} value={tone.value}>
                        {tone.label}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetAudience">Target Audience Description *</Label>
              <Textarea id="targetAudience" placeholder="Describe your ideal customer - demographics, interests, pain points, and motivations" value={formData.targetAudience} onChange={e => handleInputChange('targetAudience', e.target.value)} rows={4} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industryType">Industry/Business Type</Label>
              <Input id="industryType" placeholder="e.g., SaaS, E-commerce, Healthcare, Education" value={formData.industryType} onChange={e => handleInputChange('industryType', e.target.value)} />
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
              Provide key information about what you're offering
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="uniqueValueProp">Unique Value Proposition *</Label>
              <Textarea id="uniqueValueProp" placeholder="What makes your product/service unique? What's the main benefit you provide?" value={formData.uniqueValueProp} onChange={e => handleInputChange('uniqueValueProp', e.target.value)} rows={3} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="primaryBenefits">Primary Benefits</Label>
              <Textarea id="primaryBenefits" placeholder="List the main benefits (one per line, start with • or -)" value={formData.primaryBenefits} onChange={e => handleInputChange('primaryBenefits', e.target.value)} rows={5} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="features">Key Features</Label>
              <Textarea id="features" placeholder="List the main features (one per line, start with • or -)" value={formData.features} onChange={e => handleInputChange('features', e.target.value)} rows={5} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ctaText">Call-to-Action Text</Label>
              <Input id="ctaText" placeholder="e.g., Get Started Free, Buy Now, Learn More" value={formData.ctaText} onChange={e => handleInputChange('ctaText', e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* SEO & Technical */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-600" />
              <CardTitle>SEO & Technical Settings</CardTitle>
            </div>
            <CardDescription>
              Optimize your page for search engines and user experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="pageTitle">Page Title</Label>
              <Input id="pageTitle" placeholder="SEO-optimized page title (50-60 characters)" value={formData.pageTitle} onChange={e => handleInputChange('pageTitle', e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="seoKeywords">Target Keywords</Label>
              <Input id="seoKeywords" placeholder="keyword1, keyword2, keyword3" value={formData.seoKeywords} onChange={e => handleInputChange('seoKeywords', e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Generate Button */}
        <div className="flex justify-center">
          <Button type="submit" size="lg" disabled={isGenerating} className="px-8 py-4 text-lg">
            {isGenerating ? <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {generationStep === 'prd' && 'Step 1/2: Generating PRD...'}
                {generationStep === 'components' && 'Step 2/2: Creating Components with v0...'}
                {generationStep === 'idle' && 'Generating AI-Optimized Page...'}
              </> : <>
                <Brain className="mr-2 h-5 w-5" />
                Generate Landing Page with v0
              </>}
          </Button>
        </div>
      </form>

      {/* Page Preview Dialog */}
      <Dialog open={showPagePreview} onOpenChange={setShowPagePreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              🎉 Your v0-Generated Landing Page is Ready!
            </DialogTitle>
            <DialogDescription>
              Review your production-ready components generated by v0 AI
            </DialogDescription>
          </DialogHeader>
          
          {generatedPage && <div className="space-y-6">
              {/* v0 Demo Link */}
              {generatedPage.v0Components?.demoUrl && <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-lg text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-lg mb-1">Live v0 Demo</h4>
                      <p className="text-sm text-blue-100">View and interact with your generated components</p>
                    </div>
                    <Button asChild variant="secondary" className="bg-white text-blue-600 hover:bg-blue-50">
                      <a href={generatedPage.v0Components.demoUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open v0 Demo
                      </a>
                    </Button>
                  </div>
                </div>}

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {generatedPage.v0Components?.files?.length || 0}
                  </div>
                  <div className="text-sm text-blue-600">v0 Components</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">Shadcn</div>
                  <div className="text-sm text-green-600">UI Library</div>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {prdDocument?.historicDataSummary?.campaignCount || 0}
                  </div>
                  <div className="text-sm text-purple-600">Campaigns</div>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {prdDocument?.historicDataSummary?.experimentCount || 0}
                  </div>
                  <div className="text-sm text-orange-600">Experiments</div>
                </div>
              </div>

              {/* PRD Preview */}
              {prdDocument?.prdDocument && <div className="border rounded-lg p-6 bg-gradient-to-br from-blue-50 to-purple-50">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="h-5 w-5 text-purple-600" />
                    <h3 className="text-xl font-bold">Product Requirements Document</h3>
                  </div>
                  
                  <div className="p-4 bg-white rounded-lg border">
                    <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-6">
                      {prdDocument.prdDocument.content?.substring(0, 500)}...
                    </p>
                    <Button variant="link" className="mt-2 p-0">
                      View Full PRD
                    </Button>
                  </div>
                </div>}

              {/* Component Files */}
              {generatedPage.v0Components?.components && <div className="border rounded-lg p-6 bg-white">
                  <h3 className="text-xl font-bold mb-4">Generated Components</h3>
                  <div className="space-y-2">
                    {generatedPage.v0Components.components.allFiles?.slice(0, 5).map((file: any, idx: number) => <div key={idx} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{file.type || 'tsx'}</Badge>
                          <span className="text-sm font-mono">{file.name}</span>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>)}
                  </div>
                </div>}

              <Separator />

              <div className="flex gap-4 justify-center">
                <Button onClick={() => navigate('/dashboard/my-pages')} variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  View in Dashboard
                </Button>
                
                <Button onClick={handleDeploy} disabled={isDeploying}>
                  {isDeploying ? <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deploying...
                    </> : <>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Deploy Live
                    </>}
                </Button>
              </div>
            </div>}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPagePreview(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
};
export default CreatePage;