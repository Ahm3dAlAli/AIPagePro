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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Brain, 
  Target, 
  Users, 
  Sparkles, 
  MessageSquare, 
  Shield, 
  Zap,
  Loader2,
  Database,
  TrendingUp,
  FileText,
  Palette,
  Code,
  Globe
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CampaignFormData {
  // Core Campaign Details
  campaignObjective: string;
  primaryConversionKPI: string;
  targetAudience: string;
  buyerPersonaKeywords: string[];
  productServiceName: string;
  primaryOffer: string;
  uniqueValueProp: string;
  topBenefits: string[];
  featureList: string[];
  emotionalTriggers: string[];
  objectionsToOvercome: string[];
  
  // Social Proof & Trust
  testimonials: Array<{
    quote: string;
    author: string;
    title: string;
    company: string;
  }>;
  trustIndicators: string[];
  
  // CTAs & Forms  
  primaryCtaText: string;
  secondaryCtaText: string;
  formFields: string[];
  formApiEndpoint: string;
  
  // Media Assets
  heroImages: string[];
  secondaryImages: string[];
  videoUrl: string;
  
  // Brand & Style
  toneOfVoice: string;
  brandColorPalette: string[];
  fontStyleGuide: string;
  logoUpload: string;
  
  // Technical & SEO
  pageLayoutPreference: string;
  targetSeoKeywords: string[];
  analyticsGoogleId: string;
  privacyPolicyUrl: string;
  gdprConsentText: string;
  
  // Optional Context
  wireframeReference: string;
  templateId: string;
  brandGuidelinesId: string;
}

const AutonomousGenerationForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  const [formData, setFormData] = useState<CampaignFormData>({
    campaignObjective: '',
    primaryConversionKPI: '',
    targetAudience: '',
    buyerPersonaKeywords: [],
    productServiceName: '',
    primaryOffer: '',
    uniqueValueProp: '',
    topBenefits: [],
    featureList: [],
    emotionalTriggers: [],
    objectionsToOvercome: [],
    testimonials: [],
    trustIndicators: [],
    primaryCtaText: 'Get Started Free',
    secondaryCtaText: 'Learn More',
    formFields: ['name', 'email'],
    formApiEndpoint: '',
    heroImages: [],
    secondaryImages: [],
    videoUrl: '',
    toneOfVoice: 'professional',
    brandColorPalette: ['#007bff', '#6c757d'],
    fontStyleGuide: 'modern-sans',
    logoUpload: '',
    pageLayoutPreference: 'conversion-focused',
    targetSeoKeywords: [],
    analyticsGoogleId: '',
    privacyPolicyUrl: '',
    gdprConsentText: '',
    wireframeReference: '',
    templateId: '',
    brandGuidelinesId: ''
  });

  const handleInputChange = (field: keyof CampaignFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayInputChange = (field: keyof CampaignFormData, value: string, action: 'add' | 'remove' = 'add') => {
    setFormData(prev => ({
      ...prev,
      [field]: action === 'add' 
        ? [...(prev[field] as string[]), value]
        : (prev[field] as string[]).filter(item => item !== value)
    }));
  };

  const handleAutonomousGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.campaignObjective || !formData.targetAudience || !formData.uniqueValueProp) {
      toast({
        title: "Missing Required Information",
        description: "Please fill in campaign objective, target audience, and unique value proposition.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('autonomous-generation', {
        body: {
          ...formData,
          // Ensure arrays are properly formatted
          buyerPersonaKeywords: formData.buyerPersonaKeywords.filter(k => k.trim()),
          topBenefits: formData.topBenefits.filter(b => b.trim()),
          featureList: formData.featureList.filter(f => f.trim()),
          emotionalTriggers: formData.emotionalTriggers.filter(t => t.trim()),
          objectionsToOvercome: formData.objectionsToOvercome.filter(o => o.trim()),
          trustIndicators: formData.trustIndicators.filter(t => t.trim()),
          targetSeoKeywords: formData.targetSeoKeywords.filter(k => k.trim())
        }
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        toast({
          title: "🚀 Autonomous Generation Complete!",
          description: "Your AI-generated landing page with full rationale is ready for review."
        });
        
        // Navigate to the generated page editor
        navigate(`/dashboard/pages/${data.page.id}`);
      } else {
        throw new Error(data.error || 'Generation failed');
      }
    } catch (error: any) {
      console.error('Autonomous generation error:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate autonomous landing page. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const campaignObjectives = [
    { value: 'lead-generation', label: 'Lead Generation', icon: '📧' },
    { value: 'product-sales', label: 'Product Sales', icon: '💰' },
    { value: 'signup', label: 'User Signup', icon: '👤' },
    { value: 'demo-booking', label: 'Demo Booking', icon: '📅' },
    { value: 'newsletter', label: 'Newsletter Signup', icon: '📰' },
    { value: 'webinar', label: 'Event Registration', icon: '🎯' }
  ];

  const toneOptions = [
    { value: 'professional', label: 'Professional & Authoritative' },
    { value: 'friendly', label: 'Friendly & Approachable' },
    { value: 'urgent', label: 'Urgent & Action-Oriented' },
    { value: 'playful', label: 'Playful & Creative' },
    { value: 'technical', label: 'Technical & Detailed' },
    { value: 'conversational', label: 'Conversational & Personal' }
  ];

  const emotionalTriggerOptions = [
    'urgency', 'scarcity', 'social_proof', 'authority', 'trust', 
    'fear_of_missing_out', 'exclusivity', 'achievement', 'security', 'convenience'
  ];

  const layoutPreferences = [
    { value: 'conversion-focused', label: 'Conversion-Focused (Single CTA Path)' },
    { value: 'storytelling', label: 'Storytelling (Narrative Flow)' },
    { value: 'modular', label: 'Modular (Component-Based)' },
    { value: 'minimal', label: 'Minimal (Clean & Simple)' },
    { value: 'comprehensive', label: 'Comprehensive (All Sections)' }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-50 to-purple-50 text-primary text-sm font-medium border">
          <Brain className="h-5 w-5" />
          Autonomous AI Generation System
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Create Your High-Converting Landing Page
        </h1>
        <p className="text-muted-foreground max-w-3xl mx-auto text-lg">
          Our autonomous AI system analyzes your historic data, applies A/B test learnings, and generates a 
          conversion-optimized landing page with detailed rationale for every design decision.
        </p>
      </div>

      <form onSubmit={handleAutonomousGenerate} className="space-y-8">
        <Tabs defaultValue="strategy" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="strategy" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Strategy
            </TabsTrigger>
            <TabsTrigger value="audience" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Audience
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Content
            </TabsTrigger>
            <TabsTrigger value="social-proof" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Social Proof
            </TabsTrigger>
            <TabsTrigger value="design" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Design & SEO
            </TabsTrigger>
            <TabsTrigger value="technical" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              Technical
            </TabsTrigger>
          </TabsList>

          {/* Strategy Tab */}
          <TabsContent value="strategy">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  <CardTitle>Campaign Strategy & Goals</CardTitle>
                </div>
                <CardDescription>
                  Define your campaign objectives and core value proposition
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="objective">Campaign Objective *</Label>
                    <Select onValueChange={(value) => handleInputChange('campaignObjective', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your primary goal" />
                      </SelectTrigger>
                      <SelectContent>
                        {campaignObjectives.map((obj) => (
                          <SelectItem key={obj.value} value={obj.value}>
                            <div className="flex items-center gap-2">
                              <span>{obj.icon}</span>
                              {obj.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="kpi">Primary Conversion KPI *</Label>
                    <Input
                      id="kpi"
                      placeholder="e.g., 5% email signups, 100 demo bookings"
                      value={formData.primaryConversionKPI}
                      onChange={(e) => handleInputChange('primaryConversionKPI', e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="productName">Product/Service Name *</Label>
                  <Input
                    id="productName"
                    placeholder="Enter your product or service name"
                    value={formData.productServiceName}
                    onChange={(e) => handleInputChange('productServiceName', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="offer">Primary Offer *</Label>
                  <Textarea
                    id="offer"
                    placeholder="What exactly are you offering? (e.g., Free trial, Discount, Consultation)"
                    value={formData.primaryOffer}
                    onChange={(e) => handleInputChange('primaryOffer', e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="uvp">Unique Value Proposition *</Label>
                  <Textarea
                    id="uvp"
                    placeholder="What makes your offer unique? How do you solve your customers' main problem better than competitors?"
                    value={formData.uniqueValueProp}
                    onChange={(e) => handleInputChange('uniqueValueProp', e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audience Tab */}
          <TabsContent value="audience">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-600" />
                  <CardTitle>Target Audience & Personas</CardTitle>
                </div>
                <CardDescription>
                  Define your ideal customer to create personalized messaging
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="audience">Target Audience Description *</Label>
                  <Textarea
                    id="audience"
                    placeholder="Describe your ideal customer: demographics, job roles, pain points, goals, industry, company size, etc."
                    value={formData.targetAudience}
                    onChange={(e) => handleInputChange('targetAudience', e.target.value)}
                    className="min-h-[120px]"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Buyer Persona Keywords</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.buyerPersonaKeywords.map((keyword, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary" 
                        className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => handleArrayInputChange('buyerPersonaKeywords', keyword, 'remove')}
                      >
                        {keyword} ×
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add keywords that describe your buyers (e.g., 'CMO', 'cost-conscious', 'tech-savvy')"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const value = (e.target as HTMLInputElement).value.trim();
                          if (value) {
                            handleArrayInputChange('buyerPersonaKeywords', value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }
                      }}
                    />
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={(e) => {
                        const input = (e.target as HTMLElement).parentElement?.querySelector('input');
                        const value = input?.value.trim();
                        if (value) {
                          handleArrayInputChange('buyerPersonaKeywords', value);
                          input.value = '';
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Emotional Triggers</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {emotionalTriggerOptions.map((trigger) => (
                      <div key={trigger} className="flex items-center space-x-2">
                        <Checkbox
                          id={trigger}
                          checked={formData.emotionalTriggers.includes(trigger)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              handleArrayInputChange('emotionalTriggers', trigger);
                            } else {
                              handleArrayInputChange('emotionalTriggers', trigger, 'remove');
                            }
                          }}
                        />
                        <Label htmlFor={trigger} className="text-sm capitalize">
                          {trigger.replace('_', ' ')}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    <CardTitle>Content & Messaging</CardTitle>
                  </div>
                  <CardDescription>
                    Define your key benefits, features, and messaging strategy
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Top 3-5 Benefits (Outcomes)</Label>
                    <div className="space-y-2">
                      {formData.topBenefits.map((benefit, index) => (
                        <div key={index} className="flex gap-2">
                          <Input 
                            value={benefit}
                            onChange={(e) => {
                              const newBenefits = [...formData.topBenefits];
                              newBenefits[index] = e.target.value;
                              handleInputChange('topBenefits', newBenefits);
                            }}
                            placeholder={`Benefit ${index + 1}: What outcome do customers get?`}
                          />
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              const newBenefits = formData.topBenefits.filter((_, i) => i !== index);
                              handleInputChange('topBenefits', newBenefits);
                            }}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                      {formData.topBenefits.length < 5 && (
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => handleInputChange('topBenefits', [...formData.topBenefits, ''])}
                        >
                          Add Benefit
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Key Features</Label>
                    <div className="space-y-2">
                      {formData.featureList.map((feature, index) => (
                        <div key={index} className="flex gap-2">
                          <Input 
                            value={feature}
                            onChange={(e) => {
                              const newFeatures = [...formData.featureList];
                              newFeatures[index] = e.target.value;
                              handleInputChange('featureList', newFeatures);
                            }}
                            placeholder={`Feature ${index + 1}: What functionality do you provide?`}
                          />
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              const newFeatures = formData.featureList.filter((_, i) => i !== index);
                              handleInputChange('featureList', newFeatures);
                            }}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => handleInputChange('featureList', [...formData.featureList, ''])}
                      >
                        Add Feature
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Objections to Overcome</Label>
                    <div className="space-y-2">
                      {formData.objectionsToOvercome.map((objection, index) => (
                        <div key={index} className="flex gap-2">
                          <Input 
                            value={objection}
                            onChange={(e) => {
                              const newObjections = [...formData.objectionsToOvercome];
                              newObjections[index] = e.target.value;
                              handleInputChange('objectionsToOvercome', newObjections);
                            }}
                            placeholder={`Objection ${index + 1}: What concerns do prospects have?`}
                          />
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              const newObjections = formData.objectionsToOvercome.filter((_, i) => i !== index);
                              handleInputChange('objectionsToOvercome', newObjections);
                            }}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => handleInputChange('objectionsToOvercome', [...formData.objectionsToOvercome, ''])}
                      >
                        Add Objection
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="primaryCta">Primary CTA Text</Label>
                      <Input
                        id="primaryCta"
                        placeholder="e.g., Get Started Free, Book a Demo"
                        value={formData.primaryCtaText}
                        onChange={(e) => handleInputChange('primaryCtaText', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="secondaryCta">Secondary CTA Text</Label>
                      <Input
                        id="secondaryCta"
                        placeholder="e.g., Learn More, Watch Demo"
                        value={formData.secondaryCtaText}
                        onChange={(e) => handleInputChange('secondaryCtaText', e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Social Proof Tab */}
          <TabsContent value="social-proof">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-orange-600" />
                  <CardTitle>Social Proof & Trust Indicators</CardTitle>
                </div>
                <CardDescription>
                  Add testimonials and trust signals to build credibility
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Customer Testimonials</Label>
                  {formData.testimonials.map((testimonial, index) => (
                    <Card key={index} className="p-4">
                      <div className="space-y-3">
                        <Textarea
                          placeholder="Customer testimonial quote..."
                          value={testimonial.quote}
                          onChange={(e) => {
                            const newTestimonials = [...formData.testimonials];
                            newTestimonials[index] = { ...testimonial, quote: e.target.value };
                            handleInputChange('testimonials', newTestimonials);
                          }}
                          className="min-h-[80px]"
                        />
                        <div className="grid grid-cols-3 gap-3">
                          <Input
                            placeholder="Author Name"
                            value={testimonial.author}
                            onChange={(e) => {
                              const newTestimonials = [...formData.testimonials];
                              newTestimonials[index] = { ...testimonial, author: e.target.value };
                              handleInputChange('testimonials', newTestimonials);
                            }}
                          />
                          <Input
                            placeholder="Job Title"
                            value={testimonial.title}
                            onChange={(e) => {
                              const newTestimonials = [...formData.testimonials];
                              newTestimonials[index] = { ...testimonial, title: e.target.value };
                              handleInputChange('testimonials', newTestimonials);
                            }}
                          />
                          <div className="flex gap-2">
                            <Input
                              placeholder="Company"
                              value={testimonial.company}
                              onChange={(e) => {
                                const newTestimonials = [...formData.testimonials];
                                newTestimonials[index] = { ...testimonial, company: e.target.value };
                                handleInputChange('testimonials', newTestimonials);
                              }}
                            />
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                const newTestimonials = formData.testimonials.filter((_, i) => i !== index);
                                handleInputChange('testimonials', newTestimonials);
                              }}
                            >
                              ×
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => handleInputChange('testimonials', [
                      ...formData.testimonials, 
                      { quote: '', author: '', title: '', company: '' }
                    ])}
                  >
                    Add Testimonial
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Trust Indicators</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.trustIndicators.map((indicator, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary" 
                        className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => handleArrayInputChange('trustIndicators', indicator, 'remove')}
                      >
                        {indicator} ×
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add trust indicators (e.g., 'SSL Certified', '30-day guarantee', '10,000+ customers')"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const value = (e.target as HTMLInputElement).value.trim();
                          if (value) {
                            handleArrayInputChange('trustIndicators', value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }
                      }}
                    />
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={(e) => {
                        const input = (e.target as HTMLElement).parentElement?.querySelector('input');
                        const value = input?.value.trim();
                        if (value) {
                          handleArrayInputChange('trustIndicators', value);
                          input.value = '';
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Design & SEO Tab */}
          <TabsContent value="design">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Palette className="h-5 w-5 text-pink-600" />
                    <CardTitle>Design & Brand Guidelines</CardTitle>
                  </div>
                  <CardDescription>
                    Configure visual style and SEO optimization
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      <Label htmlFor="layout">Page Layout Preference</Label>
                      <Select 
                        value={formData.pageLayoutPreference} 
                        onValueChange={(value) => handleInputChange('pageLayoutPreference', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {layoutPreferences.map((layout) => (
                            <SelectItem key={layout.value} value={layout.value}>
                              {layout.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Target SEO Keywords</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {formData.targetSeoKeywords.map((keyword, index) => (
                        <Badge 
                          key={index} 
                          variant="secondary" 
                          className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => handleArrayInputChange('targetSeoKeywords', keyword, 'remove')}
                        >
                          {keyword} ×
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add SEO keywords (e.g., 'marketing automation', 'lead generation software')"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const value = (e.target as HTMLInputElement).value.trim();
                            if (value) {
                              handleArrayInputChange('targetSeoKeywords', value);
                              (e.target as HTMLInputElement).value = '';
                            }
                          }
                        }}
                      />
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={(e) => {
                          const input = (e.target as HTMLElement).parentElement?.querySelector('input');
                          const value = input?.value.trim();
                          if (value) {
                            handleArrayInputChange('targetSeoKeywords', value);
                            input.value = '';
                          }
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Technical Tab */}
          <TabsContent value="technical">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-gray-600" />
                  <CardTitle>Technical Configuration</CardTitle>
                </div>
                <CardDescription>
                  Analytics, forms, and compliance settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="analytics">Google Analytics ID</Label>
                    <Input
                      id="analytics"
                      placeholder="GA4-XXXXXXXXXX"
                      value={formData.analyticsGoogleId}
                      onChange={(e) => handleInputChange('analyticsGoogleId', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="formApi">Form API Endpoint</Label>
                    <Input
                      id="formApi"
                      placeholder="https://api.yourservice.com/leads"
                      value={formData.formApiEndpoint}
                      onChange={(e) => handleInputChange('formApiEndpoint', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="privacy">Privacy Policy URL</Label>
                  <Input
                    id="privacy"
                    placeholder="https://yoursite.com/privacy"
                    value={formData.privacyPolicyUrl}
                    onChange={(e) => handleInputChange('privacyPolicyUrl', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gdpr">GDPR Consent Text</Label>
                  <Textarea
                    id="gdpr"
                    placeholder="By submitting this form, you agree to our privacy policy and consent to receive marketing communications."
                    value={formData.gdprConsentText}
                    onChange={(e) => handleInputChange('gdprConsentText', e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Separator />

        {/* Generate Button */}
        <div className="flex flex-col items-center space-y-6">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Database className="h-4 w-4" />
              <span>Will analyze your historic data</span>
              <TrendingUp className="h-4 w-4" />
              <span>Apply A/B test learnings</span>
              <FileText className="h-4 w-4" />
              <span>Generate rationale report</span>
            </div>
          </div>
          
          <Button 
            type="submit" 
            size="lg" 
            disabled={isGenerating}
            className="px-12 py-4 text-lg bg-gradient-to-r from-blue-600 to-purple-600"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                Generating Your Autonomous Landing Page...
              </>
            ) : (
              <>
                <Brain className="mr-3 h-6 w-6" />
                Generate Autonomous Landing Page
              </>
            )}
          </Button>
          
          <p className="text-sm text-muted-foreground text-center max-w-2xl">
            This will create a data-driven, conversion-optimized landing page with detailed AI rationale, 
            Sitecore BYOC components, and deployment-ready code. Every design decision will be justified 
            with historic performance data and conversion best practices.
          </p>
        </div>
      </form>
    </div>
  );
};

export default AutonomousGenerationForm;