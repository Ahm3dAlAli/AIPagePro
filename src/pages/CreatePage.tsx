import { useState } from 'react';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Brain, Sparkles, Target, Copy, Database, Palette, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import EnhancedDataImport from '@/components/EnhancedDataImport';
import { ImportedData } from '@/hooks/useDataImport';
import { GenerationProgress } from '@/components/GenerationProgress';
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
  const [generationStep, setGenerationStep] = useState<'idle' | 'analyzing' | 'hero' | 'features' | 'cta' | 'complete'>('idle');
  const [prdDocument, setPrdDocument] = useState<any>(null);
  const dataImportRef = React.useRef<DataImportRef>(null);

  const getGenerationSteps = () => {
    const steps = [
      { id: 'analyzing', label: 'Analyzing historic data...', status: 'pending' as const },
      { id: 'hero', label: 'Generating hero section...', status: 'pending' as const },
      { id: 'features', label: 'Creating feature grid...', status: 'pending' as const },
      { id: 'cta', label: 'Optimizing CTA placement...', status: 'pending' as const },
    ];

    return steps.map(step => {
      if (generationStep === 'idle') return step;
      
      const stepOrder = ['analyzing', 'hero', 'features', 'cta', 'complete'];
      const currentIndex = stepOrder.indexOf(generationStep);
      const stepIndex = stepOrder.indexOf(step.id);

      if (stepIndex < currentIndex || generationStep === 'complete') {
        return { ...step, status: 'complete' as const };
      } else if (stepIndex === currentIndex) {
        return { ...step, status: 'loading' as const };
      }
      return step;
    });
  };
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
    setGenerationStep('analyzing');
    try {
      // Auto-process uploaded files if they exist
      if (dataImportRef.current?.hasFiles()) {
        const processResult = await dataImportRef.current.processFiles();
        if (processResult.success) {
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          console.warn('File processing warning:', processResult.error);
        }
      }

      // STEP 1: Generate PRD and Engineering Prompt (Analyzing phase)
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
      
      // Move to hero generation phase
      setGenerationStep('hero');
      await new Promise(resolve => setTimeout(resolve, 800));

      // STEP 2: Save to database first to get page ID
      setGenerationStep('features');
      const pageTitle = formData.pageTitle || `Landing Page - ${new Date().toISOString()}`;
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: savedPage, error: saveError } = await supabase
        .from('generated_pages')
        .insert({
          user_id: user?.id || '00000000-0000-0000-0000-000000000000',
          title: pageTitle,
          slug: `page-${Date.now()}`,
          content: {
            prdDocument: prdData.prdDocument,
            engineeringPrompt: prdData.engineeringPrompt,
            campaignConfig,
            status: 'generating'
          },
          status: 'draft',
          ai_rationale: JSON.stringify(prdData.prdDocument)
        })
        .select()
        .single();

      if (saveError) throw saveError;

      await new Promise(resolve => setTimeout(resolve, 800));
      
      // STEP 3: Generate v0 Components with page ID
      setGenerationStep('cta');
      
      const {
        data: v0Data,
        error: v0Error
      } = await supabase.functions.invoke('generate-v0-app', {
        body: {
          engineeringPrompt: prdData.engineeringPrompt,
          prdDocument: prdData.prdDocument,
          campaignConfig,
          pageId: savedPage.id
        }
      });
      if (v0Error) throw v0Error;

      await new Promise(resolve => setTimeout(resolve, 500));
      setGenerationStep('complete');
      
      toast({
        title: "✓ Generation Complete!",
        description: "Your landing page has been created successfully."
      });

      // Navigate to the generated page view immediately
      navigate(`/dashboard/generated-page/${savedPage.id}`);
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
  return <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
          <Brain className="h-4 w-4" />
          Agentic AI Landing Page Creator
        </div>
        <h1 className="text-3xl font-bold">Create Your Landing Page</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Fill in the campaign details using the organized tabs below. Our AI will generate a high-converting, brand-compliant landing page.
        </p>
        <Button type="button" variant="outline" onClick={fillExampleData} className="mt-4">
          <Copy className="mr-2 h-4 w-4" />
          Load Example Data
        </Button>
      </div>

      <form onSubmit={handleGenerate} className="space-y-8">
        <Tabs defaultValue="campaign" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="campaign">
              <Target className="h-4 w-4 mr-2" />
              Campaign
            </TabsTrigger>
            <TabsTrigger value="audience">
              <Target className="h-4 w-4 mr-2" />
              Audience
            </TabsTrigger>
            <TabsTrigger value="content">
              <Sparkles className="h-4 w-4 mr-2" />
              Content
            </TabsTrigger>
            <TabsTrigger value="design">
              <Palette className="h-4 w-4 mr-2" />
              Design
            </TabsTrigger>
            <TabsTrigger value="seo">
              <Search className="h-4 w-4 mr-2" />
              SEO
            </TabsTrigger>
            <TabsTrigger value="data">
              <Database className="h-4 w-4 mr-2" />
              Data
            </TabsTrigger>
          </TabsList>

          {/* Campaign Configuration Tab */}
          <TabsContent value="campaign" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Configuration</CardTitle>
                <CardDescription>Define your campaign objectives and strategy</CardDescription>
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
                  <Label htmlFor="industryType">Industry/Business Type</Label>
                  <Input id="industryType" placeholder="e.g., SaaS, E-commerce, Healthcare, Education" value={formData.industryType} onChange={e => handleInputChange('industryType', e.target.value)} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Target Audience Tab */}
          <TabsContent value="audience" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Target Audience</CardTitle>
                <CardDescription>Define your ideal customer profile</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="targetAudience">Target Audience Description *</Label>
                  <Textarea id="targetAudience" placeholder="Describe your ideal customer - demographics, interests, pain points, and motivations" value={formData.targetAudience} onChange={e => handleInputChange('targetAudience', e.target.value)} rows={6} />
                  <p className="text-sm text-muted-foreground">Include role, industry, pain points, and buyer persona keywords</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content & Messaging Tab */}
          <TabsContent value="content" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Content & Messaging</CardTitle>
                <CardDescription>Define your value proposition and key messages</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="uniqueValueProp">Unique Value Proposition *</Label>
                  <Textarea id="uniqueValueProp" placeholder="What makes your product/service unique? What's the main benefit you provide?" value={formData.uniqueValueProp} onChange={e => handleInputChange('uniqueValueProp', e.target.value)} rows={3} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="primaryBenefits">Primary Benefits (Top 3-5)</Label>
                  <Textarea id="primaryBenefits" placeholder="List the main benefits (one per line, start with • or -)" value={formData.primaryBenefits} onChange={e => handleInputChange('primaryBenefits', e.target.value)} rows={5} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="features">Key Features</Label>
                  <Textarea id="features" placeholder="List the main features (one per line, start with • or -)" value={formData.features} onChange={e => handleInputChange('features', e.target.value)} rows={5} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ctaText">Primary Call-to-Action Text</Label>
                  <Input id="ctaText" placeholder="e.g., Get Started Free, Buy Now, Learn More" value={formData.ctaText} onChange={e => handleInputChange('ctaText', e.target.value)} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Design & Brand Tab */}
          <TabsContent value="design" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Design & Brand Guidelines</CardTitle>
                <CardDescription>Brand colors, fonts, and visual preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Brand Color Palette (Hex Codes)</Label>
                  <Input placeholder="#3b82f6, #1e40af, #60a5fa" />
                  <p className="text-sm text-muted-foreground">Enter hex codes separated by commas</p>
                </div>

                <div className="space-y-2">
                  <Label>Font Style Guide</Label>
                  <Input placeholder="Modern sans-serif (e.g., Inter, Roboto)" />
                </div>

                <div className="space-y-2">
                  <Label>Page Layout Preference</Label>
                  <Select defaultValue="modular">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scroll">Long-Scroll Narrative</SelectItem>
                      <SelectItem value="modular">Modular Sections</SelectItem>
                      <SelectItem value="storytelling">Story-Driven</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SEO & Technical Tab */}
          <TabsContent value="seo" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>SEO & Technical Configuration</CardTitle>
                <CardDescription>Optimize your page for search engines</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="pageTitle">Page Title (50-60 characters)</Label>
                  <Input id="pageTitle" placeholder="SEO-optimized page title" value={formData.pageTitle} onChange={e => handleInputChange('pageTitle', e.target.value)} maxLength={60} />
                  <p className="text-sm text-muted-foreground">{formData.pageTitle.length}/60 characters</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="seoKeywords">Target SEO Keywords</Label>
                  <Input id="seoKeywords" placeholder="keyword1, keyword2, keyword3" value={formData.seoKeywords} onChange={e => handleInputChange('seoKeywords', e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Meta Description (Max 160 characters)</Label>
                  <Textarea placeholder="Compelling description for search results" maxLength={160} rows={3} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Historic Data Tab */}
          <TabsContent value="data" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Historic Campaign Data</CardTitle>
                <CardDescription>Upload past performance data for AI optimization</CardDescription>
              </CardHeader>
              <CardContent>
                <EnhancedDataImport ref={dataImportRef} onDataImported={handleDataImported} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Generate Button */}
        <div className="flex flex-col items-center gap-6 pt-6">
          {isGenerating && (
            <div className="w-full max-w-md">
              <GenerationProgress steps={getGenerationSteps()} />
            </div>
          )}
          
          <Button type="submit" size="lg" disabled={isGenerating} className="px-8 py-4 text-lg">
            {isGenerating ? <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating...
              </> : <>
                <Brain className="mr-2 h-5 w-5" />
                Generate
              </>}
          </Button>
        </div>
      </form>
    </div>;
};
export default CreatePage;