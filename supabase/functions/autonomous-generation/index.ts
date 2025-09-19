import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CampaignInput {
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
  formApiConfig: any;
  
  // Media Assets
  heroImages: string[];
  secondaryImages: string[];
  videoUrl?: string;
  
  // Brand & Style
  toneOfVoice: string;
  brandColorPalette: string[];
  fontStyleGuide: string;
  logoUpload?: string;
  
  // Technical & SEO
  pageLayoutPreference: string;
  targetSeoKeywords: string[];
  eventTrackingSetup: any;
  analyticsIds: any;
  privacyPolicyUrl: string;
  gdprConsentText: string;
  
  // Optional Context
  wireframeReference?: string;
  templateId?: string;
  brandGuidelinesId?: string;
}

interface HistoricInsights {
  campaignPerformance: any[];
  experimentResults: any[];
  brandGuidelines: any;
  industryBenchmarks: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    console.log('Authorization header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('No authorization header found');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Authorization header missing' 
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseClient = createClient(
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

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    console.log('User authentication result:', { user: !!user, error: userError });
    
    if (userError) {
      console.error('User authentication error:', userError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Authentication failed: ${userError.message}` 
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    if (!user) {
      console.error('No user found after authentication');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'User not authenticated' 
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const campaignInput: CampaignInput = await req.json();
    console.log('Starting autonomous generation for user:', user.id);

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Step 1: Gather Historic Data & Insights
    const historicInsights = await gatherHistoricInsights(supabaseClient, user.id, campaignInput);
    
    // Step 2: Generate AI-Powered Landing Page with Data-Driven Decisions
    const generatedContent = await generateAutonomousPage(
      openAIApiKey, 
      campaignInput, 
      historicInsights
    );

    // Step 3: Create Detailed AI Rationale Report
    const rationaleReport = await generateRationaleReport(
      openAIApiKey,
      campaignInput,
      historicInsights,
      generatedContent
    );

    // Step 4: Save Everything to Database
    const savedPage = await saveGeneratedPage(
      supabaseClient,
      user.id,
      campaignInput,
      generatedContent,
      rationaleReport
    );

    // Step 5: Generate Component Exports for Sitecore BYOC
    await generateComponentExports(
      supabaseClient,
      user.id,
      savedPage.id,
      generatedContent
    );

    console.log('Autonomous generation completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        page: savedPage,
        content: generatedContent,
        rationale: rationaleReport
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in autonomous generation:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An unexpected error occurred' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function gatherHistoricInsights(
  supabaseClient: any, 
  userId: string, 
  campaignInput: CampaignInput
): Promise<HistoricInsights> {
  console.log('Gathering historic insights...');
  
  // Fetch historic campaign data
  const { data: campaigns } = await supabaseClient
    .from('historic_campaigns')
    .select('*')
    .eq('user_id', userId)
    .order('campaign_date', { ascending: false })
    .limit(50);

  // Fetch experiment results
  const { data: experiments } = await supabaseClient
    .from('experiment_results')
    .select('*')
    .eq('user_id', userId)
    .eq('statistical_significance', true)
    .order('end_date', { ascending: false })
    .limit(20);

  // Fetch brand guidelines
  const { data: brandGuidelines } = await supabaseClient
    .from('brand_guidelines')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  // Calculate industry benchmarks from campaigns
  const industryBenchmarks = calculateIndustryBenchmarks(campaigns || []);

  return {
    campaignPerformance: campaigns || [],
    experimentResults: experiments || [],
    brandGuidelines: brandGuidelines || {},
    industryBenchmarks
  };
}

function calculateIndustryBenchmarks(campaigns: any[]): any {
  if (campaigns.length === 0) return {};

  const totalCampaigns = campaigns.length;
  const avgConversionRate = campaigns.reduce((sum, c) => sum + (c.primary_conversion_rate || 0), 0) / totalCampaigns;
  const avgBounceRate = campaigns.reduce((sum, c) => sum + (c.bounce_rate || 0), 0) / totalCampaigns;
  const avgTimeOnPage = campaigns.reduce((sum, c) => sum + (c.avg_time_on_page || 0), 0) / totalCampaigns;
  const avgCostPerConversion = campaigns.reduce((sum, c) => sum + (c.cost_per_conversion || 0), 0) / totalCampaigns;

  return {
    avgConversionRate,
    avgBounceRate,
    avgTimeOnPage,
    avgCostPerConversion,
    totalCampaigns,
    topPerformers: campaigns
      .sort((a, b) => (b.primary_conversion_rate || 0) - (a.primary_conversion_rate || 0))
      .slice(0, 5)
  };
}

async function generateAutonomousPage(
  openAIApiKey: string,
  campaignInput: CampaignInput,
  historicInsights: HistoricInsights
): Promise<any> {
  console.log('Generating autonomous page with AI...');

  const prompt = `You are an autonomous AI system specializing in high-conversion landing page generation. 
Your task is to create a data-driven, strategically optimized landing page based on the following inputs:

CAMPAIGN INPUTS:
${JSON.stringify(campaignInput, null, 2)}

HISTORIC PERFORMANCE DATA:
${JSON.stringify(historicInsights.campaignPerformance.slice(0, 10), null, 2)}

EXPERIMENT RESULTS & LEARNINGS:
${JSON.stringify(historicInsights.experimentResults.slice(0, 5), null, 2)}

BRAND GUIDELINES:
${JSON.stringify(historicInsights.brandGuidelines, null, 2)}

INDUSTRY BENCHMARKS:
${JSON.stringify(historicInsights.industryBenchmarks, null, 2)}

AUTONOMOUS GENERATION REQUIREMENTS:
1. Analyze historic data to identify top-performing patterns
2. Apply A/B test learnings to structure and content decisions
3. Ensure strict brand compliance with DIFC guidelines
4. Optimize for the specified conversion KPI: ${campaignInput.primaryConversionKPI}
5. Target the specific audience: ${campaignInput.targetAudience}
6. Address each listed objection strategically
7. Incorporate emotional triggers naturally into copy

Generate a complete, conversion-optimized landing page with detailed reasoning for every decision.

Return ONLY a JSON object with this structure:
{
  "pageTitle": "SEO-optimized title incorporating primary keywords",
  "metaDescription": "Compelling description under 160 chars with primary keyword",
  "structuralDecisions": {
    "layoutChoice": "Selected layout with rationale",
    "sectionOrder": ["array", "of", "section", "order", "with", "reasoning"],
    "contentHierarchy": "Information architecture decisions"
  },
  "sections": {
    "hero": {
      "headline": "Data-driven headline optimized for target audience",
      "subheadline": "Supporting copy addressing primary pain point",
      "ctaText": "Action-oriented CTA based on A/B test insights",
      "backgroundStyle": "gradient-primary",
      "designRationale": "Why this hero approach was chosen based on data",
      "emotionalTriggers": ["urgency", "trust", "social_proof"],
      "keywordOptimization": "How primary keywords are integrated"
    },
    "benefits": {
      "title": "Section title that resonates with buyer persona",
      "benefits": [
        {
          "title": "Benefit optimized for primary objection",
          "description": "Outcome-focused description",
          "icon": "icon-name",
          "dataSupport": "How this addresses historic conversion barriers"
        }
      ],
      "designRationale": "Benefits selection and presentation reasoning"
    },
    "socialProof": {
      "title": "Social proof section title",
      "testimonials": "Enhanced testimonials based on trust indicators",
      "trustLogos": "Strategic trust indicator placement",
      "statisticsHighlight": "Key metrics that build credibility",
      "designRationale": "Social proof strategy based on audience psychology"
    },
    "features": {
      "title": "Feature section optimized for technical buyers",
      "features": [
        {
          "title": "Feature addressing specific use case",
          "description": "Benefit-focused feature description",
          "icon": "icon-name",
          "proofPoint": "How this feature proves the value prop"
        }
      ],
      "designRationale": "Feature prioritization based on audience needs"
    },
    "objectionHandling": {
      "title": "Strategic objection handling section",
      "objections": [
        {
          "objection": "Specific objection from input",
          "response": "Data-backed response strategy",
          "supportingEvidence": "Proof points or guarantees"
        }
      ],
      "designRationale": "How objections are strategically addressed"
    },
    "pricing": {
      "title": "Value-focused pricing presentation",
      "strategy": "Pricing psychology approach based on audience",
      "plans": "Optimized pricing structure if applicable",
      "designRationale": "Pricing presentation strategy"
    },
    "faq": {
      "title": "FAQ section addressing buyer journey",
      "questions": [
        {
          "question": "Strategic question addressing buying process",
          "answer": "Comprehensive answer that moves toward conversion"
        }
      ],
      "designRationale": "FAQ strategy for conversion optimization"
    },
    "finalCta": {
      "headline": "Urgency-driven final CTA headline",
      "subtext": "Risk-reversal or guarantee messaging",
      "ctaText": "Action-oriented button text",
      "designRationale": "Final conversion strategy"
    }
  },
  "conversionOptimizations": {
    "formStrategy": "Form field optimization based on conversion data",
    "ctaPlacement": "Strategic CTA positioning throughout page",
    "trustSignals": "Trust building elements placement",
    "urgencyElements": "Scarcity and urgency tactics used",
    "mobileOptimizations": "Mobile-specific conversion optimizations"
  },
  "seoStrategy": {
    "primaryKeywords": "Target keyword integration strategy",
    "contentOptimization": "On-page SEO approach",
    "metaOptimization": "Meta tag strategy",
    "schemaMarkup": "Structured data approach"
  },
  "aiDecisionSummary": "Comprehensive summary of all AI decisions and their data-driven rationale"
}

Base all decisions on the provided historic data, experiment results, and conversion best practices. Every element should have a strategic purpose tied to the conversion goal.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5-2025-08-07',
      messages: [
        {
          role: 'system',
          content: 'You are an autonomous AI landing page generation system with expertise in conversion optimization, data analysis, and strategic marketing. Always return valid JSON responses with detailed rationale for every decision.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_completion_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API error:', errorText);
    throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
  }

  const openAIData = await response.json();
  const contentText = openAIData.choices[0].message.content;
  
  const jsonStart = contentText.indexOf('{');
  const jsonEnd = contentText.lastIndexOf('}') + 1;
  const jsonString = contentText.slice(jsonStart, jsonEnd);
  
  return JSON.parse(jsonString);
}

async function generateRationaleReport(
  openAIApiKey: string,
  campaignInput: CampaignInput,
  historicInsights: HistoricInsights,
  generatedContent: any
): Promise<any> {
  console.log('Generating detailed rationale report...');

  const prompt = `Create a comprehensive AI rationale report explaining every design and content decision made in the landing page generation.

ORIGINAL INPUTS:
${JSON.stringify(campaignInput, null, 2)}

HISTORIC DATA USED:
${JSON.stringify(historicInsights, null, 2)}

GENERATED CONTENT:
${JSON.stringify(generatedContent, null, 2)}

Generate a detailed explanation report that justifies every decision. Return ONLY a JSON object:
{
  "executiveSummary": "High-level summary of the autonomous generation approach and key decisions",
  "dataAnalysisFindings": {
    "historicPerformanceInsights": "Key patterns found in historic campaign data",
    "experimentLearnings": "Critical learnings from A/B test results",
    "industryBenchmarkComparison": "How this page compares to industry standards",
    "audienceInsights": "Target audience analysis and implications"
  },
  "designDecisionRationale": {
    "structuralChoices": "Why this page structure was selected",
    "contentStrategy": "Content approach and messaging strategy reasoning",
    "visualDesignRationale": "Design element choices and brand compliance",
    "conversionOptimizations": "Specific conversion tactics and their justification"
  },
  "sectionBySection": {
    "hero": "Detailed hero section decision rationale",
    "benefits": "Benefits section strategy and content choices",
    "socialProof": "Social proof approach and trust building strategy",
    "features": "Feature prioritization and presentation reasoning",
    "objectionHandling": "Objection handling strategy and approach",
    "pricing": "Pricing presentation strategy if applicable",
    "faq": "FAQ strategy and question selection reasoning",
    "finalCta": "Final conversion strategy and CTA optimization"
  },
  "performancePredictions": {
    "expectedConversionRate": "Predicted conversion rate based on historic data",
    "keySuccessFactors": "Elements most likely to drive conversions",
    "potentialOptimizations": "Areas identified for future A/B testing",
    "riskMitigation": "How potential issues were addressed"
  },
  "complianceVerification": {
    "brandGuidelineAdherence": "How brand guidelines were followed",
    "legalCompliance": "GDPR/privacy compliance measures",
    "accessibilityConsiderations": "Accessibility features included"
  },
  "nextSteps": {
    "recommendedTests": "Suggested A/B tests for optimization",
    "trackingSetup": "Analytics and tracking recommendations",
    "iterationPlan": "Recommended improvement cycle"
  }
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-5-2025-08-07',
      messages: [
        {
          role: 'system',
          content: 'You are an AI report generator specializing in landing page optimization analysis and strategic marketing rationale. Always return valid JSON responses.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_completion_tokens: 3000,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to generate rationale report: ${response.status}`);
  }

  const openAIData = await response.json();
  const contentText = openAIData.choices[0].message.content;
  
  const jsonStart = contentText.indexOf('{');
  const jsonEnd = contentText.lastIndexOf('}') + 1;
  const jsonString = contentText.slice(jsonStart, jsonEnd);
  
  return JSON.parse(jsonString);
}

async function saveGeneratedPage(
  supabaseClient: any,
  userId: string,
  campaignInput: CampaignInput,
  generatedContent: any,
  rationaleReport: any
): Promise<any> {
  console.log('Saving generated page and rationale...');

  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const slug = `autonomous-${timestamp}-${randomSuffix}`;

  // Save the main page
  const { data: savedPage, error: saveError } = await supabaseClient
    .from('generated_pages')
    .insert({
      user_id: userId,
      title: generatedContent.pageTitle || campaignInput.productServiceName,
      slug: slug,
      content: generatedContent,
      seo_config: {
        title: generatedContent.pageTitle,
        description: generatedContent.metaDescription,
        keywords: campaignInput.targetSeoKeywords?.join(', ') || ''
      },
      generation_prompts: {
        originalInput: campaignInput,
        aiDecisions: generatedContent.aiDecisionSummary
      },
      status: 'draft'
    })
    .select()
    .single();

  if (saveError) {
    console.error('Database save error:', saveError);
    throw new Error('Failed to save generated page');
  }

  // Save the rationale report
  await supabaseClient
    .from('ai_rationale_reports')
    .insert({
      user_id: userId,
      page_id: savedPage.id,
      report_type: 'autonomous_generation',
      rationale_data: rationaleReport
    });

  return savedPage;
}

async function generateComponentExports(
  supabaseClient: any,
  userId: string,
  pageId: string,
  generatedContent: any
): Promise<void> {
  console.log('Generating Sitecore BYOC component exports...');

  const sections = generatedContent.sections || {};
  
  for (const [sectionType, sectionContent] of Object.entries(sections)) {
    if (typeof sectionContent === 'object' && sectionContent !== null) {
      const reactCode = generateReactComponent(sectionType, sectionContent as any);
      const jsonSchema = generateJsonSchema(sectionType, sectionContent as any);
      const sitecoreManifest = generateSitecoreManifest(sectionType, sectionContent as any);

      await supabaseClient
        .from('component_exports')
        .insert({
          user_id: userId,
          page_id: pageId,
          component_name: `${sectionType}Section`,
          component_type: sectionType,
          react_code: reactCode,
          json_schema: jsonSchema,
          sitecore_manifest: sitecoreManifest,
          export_format: 'react_tsx'
        });
    }
  }
}

function generateReactComponent(sectionType: string, sectionContent: any): string {
  return `import React from 'react';

interface ${sectionType}Props {
  ${Object.keys(sectionContent).map(key => 
    `${key}?: ${typeof sectionContent[key] === 'string' ? 'string' : 'any'};`
  ).join('\n  ')}
}

export const ${sectionType}Section: React.FC<${sectionType}Props> = ({
  ${Object.keys(sectionContent).join(',\n  ')}
}) => {
  return (
    <section className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        ${generateSectionJSX(sectionType, sectionContent)}
      </div>
    </section>
  );
};

export default ${sectionType}Section;`;
}

function generateSectionJSX(sectionType: string, content: any): string {
  switch (sectionType) {
    case 'hero':
      return `
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">{headline || "${content.headline || 'Default Headline'}"}</h1>
          <p className="text-xl mb-8">{subheadline || "${content.subheadline || 'Default Subheadline'}"}</p>
          <button className="bg-primary text-white px-8 py-3 rounded-lg font-semibold">
            {ctaText || "${content.ctaText || 'Get Started'}"}
          </button>
        </div>`;
    case 'benefits':
      return `
        <div>
          <h2 className="text-3xl font-bold text-center mb-12">{title || "${content.title || 'Benefits'}"}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {(benefits || []).map((benefit, index) => (
              <div key={index} className="text-center">
                <h3 className="text-xl font-semibold mb-4">{benefit.title}</h3>
                <p>{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>`;
    default:
      return `<div>Content for ${sectionType} section</div>`;
  }
}

function generateJsonSchema(sectionType: string, sectionContent: any): any {
  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    type: "object",
    title: `${sectionType} Section Configuration`,
    properties: Object.fromEntries(
      Object.entries(sectionContent).map(([key, value]) => [
        key,
        {
          type: typeof value === 'string' ? 'string' : 'object',
          title: key.charAt(0).toUpperCase() + key.slice(1),
          description: `Configuration for ${key}`
        }
      ])
    )
  };
}

function generateSitecoreManifest(sectionType: string, sectionContent: any): any {
  return {
    name: `${sectionType}Section`,
    displayName: `${sectionType.charAt(0).toUpperCase() + sectionType.slice(1)} Section`,
    description: `Autonomous AI-generated ${sectionType} section component`,
    fields: Object.keys(sectionContent).map(key => ({
      name: key,
      type: "text",
      displayName: key.charAt(0).toUpperCase() + key.slice(1)
    })),
    templateId: `{${crypto.randomUUID()}}`,
    datasource: {
      template: `${sectionType}SectionData`
    }
  };
}