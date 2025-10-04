import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CampaignConfig {
  campaignObjective: string;
  primaryConversionKPI: string;
  targetAudience: string;
  productServiceName: string;
  primaryOffer: string;
  uniqueValueProp: string;
  topBenefits: string[];
  featureList: string[];
  emotionalTriggers: string[];
  testimonials: Array<{
    quote: string;
    author: string;
    title: string;
    company: string;
  }>;
  trustIndicators: string[];
  primaryCtaText: string;
  toneOfVoice: string;
  brandColorPalette: string[];
  fontStyleGuide: string;
  targetSeoKeywords: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting PRD and prompt generation');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const userClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { 
          global: { 
            headers: { 
              Authorization: authHeader 
            } 
          }
        }
      );
      
      const { data: { user } } = await userClient.auth.getUser();
      userId = user?.id || '00000000-0000-0000-0000-000000000000';
    } else {
      userId = '00000000-0000-0000-0000-000000000000';
    }

    const { campaignConfig } = await req.json() as { campaignConfig: CampaignConfig };
    
    // Step 1: Gather historic data
    console.log('Gathering historic data...');
    const historicData = await gatherHistoricData(supabaseClient, userId);
    
    // Step 2: Generate PRD using AI
    console.log('Generating PRD document...');
    const prdDocument = await generatePRD(campaignConfig, historicData);
    
    // Step 3: Generate engineering prompt for v0
    console.log('Generating engineering prompt...');
    const engineeringPrompt = generateEngineeringPrompt(campaignConfig, historicData, prdDocument);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        prdDocument,
        engineeringPrompt,
        historicDataSummary: {
          campaignCount: historicData.campaigns.length,
          experimentCount: historicData.experiments.length,
          avgConversionRate: historicData.avgConversionRate
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error generating PRD and prompt:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function gatherHistoricData(supabaseClient: any, userId: string) {
  let campaigns: any[] = [];
  let experiments: any[] = [];

  try {
    const { data: campaignsData } = await supabaseClient
      .from('historic_campaigns')
      .select('*')
      .eq('user_id', userId)
      .order('campaign_date', { ascending: false })
      .limit(50);
    
    if (campaignsData) campaigns = campaignsData;
  } catch (error) {
    console.log('Error fetching campaigns:', error);
  }

  try {
    const { data: experimentsData } = await supabaseClient
      .from('experiment_results')
      .select('*')
      .eq('user_id', userId)
      .eq('statistical_significance', true)
      .order('end_date', { ascending: false })
      .limit(20);
    
    if (experimentsData) experiments = experimentsData;
  } catch (error) {
    console.log('Error fetching experiments:', error);
  }

  // Calculate metrics
  const avgConversionRate = campaigns.length > 0
    ? campaigns.reduce((sum, c) => sum + (c.primary_conversion_rate || 0), 0) / campaigns.length
    : 0;

  const topPerformingChannels = calculateTopChannels(campaigns);
  const devicePerformance = calculateDevicePerformance(campaigns);
  const experimentInsights = extractExperimentInsights(experiments);

  return {
    campaigns,
    experiments,
    avgConversionRate,
    topPerformingChannels,
    devicePerformance,
    experimentInsights
  };
}

function calculateTopChannels(campaigns: any[]) {
  const channelPerformance = campaigns.reduce((acc: any, campaign: any) => {
    const channel = campaign.utm_source || 'direct';
    if (!acc[channel]) {
      acc[channel] = { sessions: 0, conversions: 0 };
    }
    acc[channel].sessions += campaign.sessions || 0;
    acc[channel].conversions += campaign.primary_conversions || 0;
    return acc;
  }, {});

  return Object.entries(channelPerformance)
    .map(([channel, data]: [string, any]) => ({
      channel,
      conversionRate: data.sessions > 0 ? (data.conversions / data.sessions) : 0
    }))
    .sort((a: any, b: any) => b.conversionRate - a.conversionRate)
    .slice(0, 3);
}

function calculateDevicePerformance(campaigns: any[]) {
  const devicePerformance = campaigns.reduce((acc: any, campaign: any) => {
    const device = campaign.device_type || 'desktop';
    if (!acc[device]) {
      acc[device] = { sessions: 0, conversions: 0 };
    }
    acc[device].sessions += campaign.sessions || 0;
    acc[device].conversions += campaign.primary_conversions || 0;
    return acc;
  }, {});

  return Object.entries(devicePerformance)
    .map(([device, data]: [string, any]) => ({
      device,
      conversionRate: data.sessions > 0 ? (data.conversions / data.sessions) : 0
    }))
    .sort((a: any, b: any) => b.conversionRate - a.conversionRate);
}

function extractExperimentInsights(experiments: any[]) {
  return experiments
    .filter(exp => exp.statistical_significance && exp.uplift_relative > 0)
    .map(exp => ({
      name: exp.experiment_name,
      hypothesis: exp.hypothesis,
      uplift: exp.uplift_relative,
      winningVariant: exp.winning_variant,
      keyInsights: exp.key_insights
    }))
    .slice(0, 5);
}

async function generatePRD(config: CampaignConfig, historicData: any) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    return generateBasicPRD(config, historicData);
  }

  const prompt = `Generate a comprehensive Product Requirements Document (PRD) for a landing page with the following specifications:

## Campaign Overview
- Product/Service: ${config.productServiceName}
- Objective: ${config.campaignObjective}
- Primary KPI: ${config.primaryConversionKPI}
- Target Audience: ${config.targetAudience}
- Value Proposition: ${config.uniqueValueProp}

## Key Benefits
${config.topBenefits.map((b, i) => `${i + 1}. ${b}`).join('\n')}

## Features
${config.featureList.map((f, i) => `${i + 1}. ${f}`).join('\n')}

## Historic Performance Data
- Total Historic Campaigns: ${historicData.campaigns.length}
- Average Conversion Rate: ${(historicData.avgConversionRate * 100).toFixed(2)}%
- Top Performing Channels: ${historicData.topPerformingChannels.map((c: any) => `${c.channel} (${(c.conversionRate * 100).toFixed(1)}%)`).join(', ')}
- Best Device: ${historicData.devicePerformance[0]?.device || 'desktop'}

## Experiment Insights
${historicData.experimentInsights.map((exp: any, i: number) => 
  `${i + 1}. ${exp.name}: ${exp.hypothesis} - Uplift: ${exp.uplift}%`
).join('\n')}

## Design & Brand
- Tone: ${config.toneOfVoice}
- Colors: ${config.brandColorPalette.join(', ')}
- Font: ${config.fontStyleGuide}

## Social Proof
${config.testimonials.map((t, i) => `${i + 1}. "${t.quote}" - ${t.author}, ${t.title} at ${t.company}`).join('\n')}

Generate a detailed PRD that includes:
1. Executive Summary
2. Goals & Success Metrics (use historic data as benchmarks)
3. Target Audience Analysis
4. User Journey & Flow
5. Page Structure & Sections (hero, benefits, features, social proof, FAQ, final CTA)
6. Content Requirements
7. Design Requirements (using Shadcn UI components)
8. Technical Requirements
9. SEO Requirements
10. Conversion Optimization Strategy (based on experiment insights)`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert product manager specializing in high-converting landing pages. Generate detailed, data-driven PRDs based on historic performance data and A/B test insights.' 
          },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      console.error('AI API error:', response.status);
      return generateBasicPRD(config, historicData);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    return {
      content,
      generatedAt: new Date().toISOString(),
      model: 'google/gemini-2.5-flash',
      dataSourcesUsed: {
        campaignCount: historicData.campaigns.length,
        experimentCount: historicData.experiments.length,
        avgConversionRate: historicData.avgConversionRate
      }
    };
  } catch (error) {
    console.error('Error calling AI API:', error);
    return generateBasicPRD(config, historicData);
  }
}

function generateBasicPRD(config: CampaignConfig, historicData: any) {
  return {
    content: `# Product Requirements Document
## Landing Page for ${config.productServiceName}

### Executive Summary
This landing page is designed to achieve ${config.campaignObjective} targeting ${config.targetAudience}.

### Goals & Success Metrics
- Primary KPI: ${config.primaryConversionKPI}
- Target Conversion Rate: ${((historicData.avgConversionRate * 1.2) * 100).toFixed(1)}% (20% improvement over ${(historicData.avgConversionRate * 100).toFixed(1)}% average)
- Secondary Metrics: Engagement rate, time on page, form completion rate

### Target Audience
${config.targetAudience}

### Value Proposition
${config.uniqueValueProp}

### Page Structure
1. **Hero Section**: Attention-grabbing headline with primary CTA
2. **Benefits Section**: ${config.topBenefits.length} key benefits
3. **Features Section**: ${config.featureList.length} product features
4. **Social Proof**: Customer testimonials and trust indicators
5. **FAQ Section**: Address common objections
6. **Final CTA**: Strong call-to-action

### Design Requirements
- Tone: ${config.toneOfVoice}
- Color Palette: ${config.brandColorPalette.join(', ')}
- Typography: ${config.fontStyleGuide}
- UI Library: Shadcn UI components
- Framework: React with TypeScript

### Conversion Optimization
Based on ${historicData.experiments.length} A/B tests:
${historicData.experimentInsights.map((exp: any) => `- ${exp.hypothesis}: ${exp.uplift}% uplift`).join('\n')}

### SEO Keywords
${config.targetSeoKeywords.join(', ')}`,
    generatedAt: new Date().toISOString(),
    model: 'basic',
    dataSourcesUsed: {
      campaignCount: historicData.campaigns.length,
      experimentCount: historicData.experiments.length,
      avgConversionRate: historicData.avgConversionRate
    }
  };
}

function generateEngineeringPrompt(
  config: CampaignConfig,
  historicData: any,
  prdDocument: any
): string {
  return `Create a production-ready, high-converting landing page using Shadcn UI components and modern React best practices.

## Technical Stack
- React 18+ with TypeScript
- Shadcn UI component library (https://ui.shadcn.com)
- Tailwind CSS for styling
- Lucide React for icons
- React Hook Form for form handling
- Zod for validation

## Product Requirements Summary
${config.productServiceName} - ${config.campaignObjective}
Target: ${config.targetAudience}

## Data-Driven Optimizations
Historic conversion rate: ${(historicData.avgConversionRate * 100).toFixed(2)}%
Target conversion rate: ${((historicData.avgConversionRate * 1.2) * 100).toFixed(1)}%
Best performing channel: ${historicData.topPerformingChannels[0]?.channel || 'direct'}
Optimal device: ${historicData.devicePerformance[0]?.device || 'desktop'}

## Experiment Learnings Applied
${historicData.experimentInsights.map((exp: any, i: number) => 
  `${i + 1}. ${exp.hypothesis} (${exp.uplift}% uplift) - Apply winning variant`
).join('\n')}

## Image Generation Requirements
IMPORTANT: Generate contextual, high-quality images that align with the campaign:
- **Hero Image**: Create a compelling, photorealistic hero image representing ${config.productServiceName} for ${config.targetAudience}. Style: ${config.toneOfVoice}, using colors: ${config.brandColorPalette.join(', ')}
- **Feature Visuals**: Generate relevant images/illustrations for each feature showing it in action
- **Benefit Graphics**: Create supporting visuals that illustrate each key benefit
- **Background Elements**: Design subtle background patterns/graphics using brand colors
- **CTA Supporting Visuals**: Generate imagery that draws attention to calls-to-action
- All generated images must maintain consistent style, color scheme (${config.brandColorPalette.join(', ')}), and tone (${config.toneOfVoice})

## Page Structure & Components

### 1. Hero Section
Use: \`<Card>\`, \`<Button>\`, \`<Badge>\`
- Compelling headline: "${config.uniqueValueProp}"
- Subheadline targeting ${config.targetAudience}
- Primary CTA: "${config.primaryCtaText}"
- **GENERATE HERO IMAGE**: High-impact visual showing ${config.productServiceName} in action for ${config.targetAudience}
- Trust badges: ${config.trustIndicators.join(', ')}

### 2. Benefits Section
Use: \`<Card>\`, Lucide icons
**GENERATE supporting visuals for each benefit:**
${config.topBenefits.map((benefit, i) => `${i + 1}. ${benefit} (generate relevant illustration)`).join('\n')}

### 3. Features Section
Use: \`<Accordion>\` or \`<Tabs>\`
**GENERATE feature visuals showing each in action:**
${config.featureList.map((feature, i) => `${i + 1}. ${feature} (generate supporting visual)`).join('\n')}

### 4. Social Proof Section
Use: \`<Card>\`, \`<Avatar>\`
${config.testimonials.map((t, i) => 
  `Testimonial ${i + 1}: "${t.quote}" - ${t.author}, ${t.title} at ${t.company}`
).join('\n')}

### 5. FAQ Section
Use: \`<Accordion>\`
Address common questions about ${config.productServiceName}

### 6. Final CTA Section
Use: \`<Card>\`, \`<Button>\`, \`<Form>\`
- Repeat primary CTA: "${config.primaryCtaText}"
- Lead capture form with validation
- Privacy policy note

## Design System
Colors: ${config.brandColorPalette.map((color, i) => `color-${i + 1}: ${color}`).join(', ')}
Typography: ${config.fontStyleGuide}
Tone: ${config.toneOfVoice}

## Form Fields & Validation
Create a contact form with proper validation using React Hook Form and Zod:
- Email (required, valid email format)
- Name (required, min 2 characters)
- Company/Organization (optional)
- Message/Inquiry (optional, textarea)

## Shadcn Components to Use
- Button (primary, secondary, outline variants)
- Card (for section containers)
- Form, Input, Textarea (for lead capture)
- Badge (for trust indicators)
- Accordion (for FAQ)
- Separator (section dividers)
- Avatar (for testimonials)

## Responsive Design
- Mobile-first approach
- Optimize for ${historicData.devicePerformance[0]?.device || 'desktop'} based on performance data
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)

## SEO Requirements
- Title: ${config.productServiceName} - ${config.uniqueValueProp}
- Meta description (150-160 chars)
- Keywords: ${config.targetSeoKeywords.join(', ')}
- Semantic HTML5 structure
- Proper heading hierarchy (single h1, then h2, h3)
- Image alt texts

## Performance Optimization
- Lazy load images below the fold
- Minimize bundle size
- Fast Time to Interactive (TTI)
- Core Web Vitals optimization

## Accessibility (WCAG 2.1 Level AA)
- Proper ARIA labels
- Keyboard navigation support
- Focus indicators
- Color contrast ratio > 4.5:1
- Screen reader friendly

## Analytics & Tracking
- Track CTA clicks
- Form interactions
- Scroll depth
- Time on page

Generate a complete, functional landing page that follows all these specifications and uses only Shadcn UI components from ui.shadcn.com.`;
}
