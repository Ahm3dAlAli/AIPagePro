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
import { Loader2, Brain, Sparkles, Target, Users, MessageSquare, Zap, Copy, Database, Eye, ExternalLink, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import DataImportManager from '@/components/DataImportManager';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
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
      // Use autonomous generation for comprehensive AI optimization
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
            <DataImportManager onDataImported={setImportedData} />
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