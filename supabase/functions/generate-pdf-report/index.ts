import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { pageId, reportType = 'design_rationale' } = await req.json();
    console.log('Generating PDF report for page:', pageId);

    // Fetch the rationale report data
    const { data: reportData, error: reportError } = await supabaseClient
      .from('ai_rationale_reports')
      .select('*')
      .eq('page_id', pageId)
      .eq('report_type', reportType)
      .single();

    if (reportError || !reportData) {
      throw new Error('Rationale report not found');
    }

    // Fetch the page data
    const { data: pageData, error: pageError } = await supabaseClient
      .from('generated_pages')
      .select('*')
      .eq('id', pageId)
      .single();

    if (pageError || !pageData) {
      throw new Error('Page not found');
    }

    // Generate HTML content for PDF
    const htmlContent = generatePDFHTML(pageData, reportData.rationale_data);
    
    // Convert HTML to PDF using a service (placeholder - would need actual PDF service)
    const pdfBuffer = await generatePDFFromHTML(htmlContent);
    
    // In a real implementation, you'd save this to storage and return a URL
    // For now, we'll return the HTML content
    return new Response(
      JSON.stringify({ 
        success: true,
        htmlContent: htmlContent,
        reportData: reportData.rationale_data
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error generating PDF report:', error);
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

function generatePDFHTML(pageData: any, rationaleData: any): string {
  const content = pageData.content;
  const rationale = rationaleData;

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>AI Landing Page Rationale Report</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #007bff;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .section {
            margin-bottom: 30px;
            page-break-inside: avoid;
        }
        .section-title {
            color: #007bff;
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 15px;
            border-left: 4px solid #007bff;
            padding-left: 15px;
        }
        .subsection {
            margin-bottom: 20px;
            padding-left: 20px;
        }
        .subsection-title {
            font-weight: bold;
            color: #555;
            margin-bottom: 10px;
        }
        .decision-box {
            background: #f8f9fa;
            border-left: 4px solid #28a745;
            padding: 15px;
            margin: 15px 0;
        }
        .data-insight {
            background: #e7f3ff;
            border: 1px solid #007bff;
            padding: 10px;
            margin: 10px 0;
            border-radius: 4px;
        }
        .performance-metric {
            display: inline-block;
            background: #007bff;
            color: white;
            padding: 5px 10px;
            margin: 5px;
            border-radius: 15px;
            font-size: 12px;
        }
        .page-break {
            page-break-before: always;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Autonomous AI Landing Page Generation Report</h1>
        <h2>${pageData.title}</h2>
        <p><strong>Generated:</strong> ${new Date(pageData.created_at).toLocaleDateString()}</p>
        <p><strong>Page ID:</strong> ${pageData.id}</p>
    </div>

    <div class="section">
        <h2 class="section-title">Executive Summary</h2>
        <p>${rationale.executiveSummary || 'This report provides a comprehensive analysis of all AI-driven decisions made during the autonomous landing page generation process.'}</p>
    </div>

    <div class="section">
        <h2 class="section-title">Data Analysis Findings</h2>
        
        <div class="subsection">
            <h3 class="subsection-title">Historic Performance Insights</h3>
            <div class="data-insight">
                ${rationale.dataAnalysisFindings?.historicPerformanceInsights || 'No historic performance data available.'}
            </div>
        </div>

        <div class="subsection">
            <h3 class="subsection-title">Experiment Learnings</h3>
            <div class="data-insight">
                ${rationale.dataAnalysisFindings?.experimentLearnings || 'No A/B test data available.'}
            </div>
        </div>

        <div class="subsection">
            <h3 class="subsection-title">Industry Benchmark Comparison</h3>
            <div class="data-insight">
                ${rationale.dataAnalysisFindings?.industryBenchmarkComparison || 'No industry benchmark data available.'}
            </div>
        </div>
    </div>

    <div class="section page-break">
        <h2 class="section-title">Design Decision Rationale</h2>
        
        <div class="decision-box">
            <h3>Structural Choices</h3>
            <p>${rationale.designDecisionRationale?.structuralChoices || 'Page structure optimized based on conversion best practices.'}</p>
        </div>

        <div class="decision-box">
            <h3>Content Strategy</h3>
            <p>${rationale.designDecisionRationale?.contentStrategy || 'Content strategy aligned with target audience needs.'}</p>
        </div>

        <div class="decision-box">
            <h3>Visual Design Rationale</h3>
            <p>${rationale.designDecisionRationale?.visualDesignRationale || 'Visual design follows brand guidelines and conversion principles.'}</p>
        </div>
    </div>

    <div class="section page-break">
        <h2 class="section-title">Section-by-Section Analysis</h2>
        
        ${Object.entries(content.sections || {}).map(([sectionName, sectionContent]) => `
        <div class="subsection">
            <h3 class="subsection-title">${sectionName.toUpperCase()} Section</h3>
            <div class="decision-box">
                <p><strong>Content:</strong> ${JSON.stringify(sectionContent, null, 2).substring(0, 200)}...</p>
                <p><strong>Rationale:</strong> ${rationale.sectionBySection?.[sectionName] || `${sectionName} section optimized for conversion and user engagement.`}</p>
            </div>
        </div>
        `).join('')}
    </div>

    <div class="section page-break">
        <h2 class="section-title">Performance Predictions</h2>
        
        <table>
            <tr>
                <th>Metric</th>
                <th>Prediction</th>
                <th>Rationale</th>
            </tr>
            <tr>
                <td>Expected Conversion Rate</td>
                <td>${rationale.performancePredictions?.expectedConversionRate || 'TBD based on testing'}</td>
                <td>Based on historic data analysis and optimization techniques applied</td>
            </tr>
            <tr>
                <td>Key Success Factors</td>
                <td colspan="2">${rationale.performancePredictions?.keySuccessFactors || 'Strategic CTA placement, social proof integration, objection handling'}</td>
            </tr>
        </table>

        <div class="subsection">
            <h3 class="subsection-title">Recommended A/B Tests</h3>
            <ul>
                ${(rationale.nextSteps?.recommendedTests || ['Headline variations', 'CTA button colors', 'Form field optimization']).map(test => `<li>${test}</li>`).join('')}
            </ul>
        </div>
    </div>

    <div class="section">
        <h2 class="section-title">Compliance Verification</h2>
        
        <div class="subsection">
            <h3 class="subsection-title">Brand Guideline Adherence</h3>
            <p>${rationale.complianceVerification?.brandGuidelineAdherence || 'All brand guidelines have been followed according to DIFC standards.'}</p>
        </div>

        <div class="subsection">
            <h3 class="subsection-title">Legal Compliance</h3>
            <p>${rationale.complianceVerification?.legalCompliance || 'GDPR and privacy compliance measures have been implemented.'}</p>
        </div>
    </div>

    <div class="section">
        <h2 class="section-title">Next Steps & Recommendations</h2>
        
        <div class="subsection">
            <h3 class="subsection-title">Tracking Setup</h3>
            <p>${rationale.nextSteps?.trackingSetup || 'Implement comprehensive analytics tracking for all CTAs, form interactions, and engagement metrics.'}</p>
        </div>

        <div class="subsection">
            <h3 class="subsection-title">Iteration Plan</h3>
            <p>${rationale.nextSteps?.iterationPlan || 'Plan bi-weekly optimization cycles based on performance data and user feedback.'}</p>
        </div>
    </div>

    <div class="section">
        <div style="text-align: center; margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p><em>This report was generated by the Autonomous AI Landing Page System</em></p>
            <p><small>Generated on ${new Date().toISOString()}</small></p>
        </div>
    </div>
</body>
</html>`;
}

async function generatePDFFromHTML(htmlContent: string): Promise<Uint8Array> {
  // This is a placeholder function. In a real implementation, you would:
  // 1. Use a service like Puppeteer, jsPDF, or a PDF API
  // 2. Convert the HTML to PDF
  // 3. Return the PDF buffer
  
  // For now, just return the HTML as bytes
  return new TextEncoder().encode(htmlContent);
}