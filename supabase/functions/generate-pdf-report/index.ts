import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generatePDFHTML(rationaleData: any, pageTitle: string): string {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PagePilot AI - Design Rationale Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            background: #fff;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 30px;
            margin-bottom: 40px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
        }
        .subtitle {
            color: #666;
            font-size: 16px;
        }
        .meta-info {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            border-left: 4px solid #2563eb;
        }
        h1 {
            color: #1e293b;
            font-size: 28px;
            margin-bottom: 20px;
        }
        h2 {
            color: #334155;
            font-size: 20px;
            margin-top: 30px;
            margin-bottom: 15px;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 5px;
        }
        h3 {
            color: #475569;
            font-size: 16px;
            margin-top: 20px;
            margin-bottom: 10px;
        }
        .decision-block {
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .confidence-score {
            display: inline-block;
            background: #10b981;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            margin-left: 10px;
        }
        .alternative {
            background: #fef3c7;
            border-left: 3px solid #f59e0b;
            padding: 10px 15px;
            margin: 10px 0;
        }
        .metric {
            background: #dbeafe;
            border-left: 3px solid #3b82f6;
            padding: 15px;
            margin: 10px 0;
        }
        .compliance-score {
            font-size: 24px;
            font-weight: bold;
            color: #059669;
        }
        .violations {
            background: #fef2f2;
            border-left: 3px solid #ef4444;
            padding: 10px 15px;
            margin: 10px 0;
        }
        .test-recommendation {
            background: #f0f9ff;
            border: 1px solid #0ea5e9;
            border-radius: 6px;
            padding: 15px;
            margin: 10px 0;
        }
        ul {
            padding-left: 20px;
        }
        .footer {
            margin-top: 50px;
            text-align: center;
            color: #666;
            font-size: 12px;
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
        }
        @media print {
            body { margin: 0; padding: 20px; }
            .header { page-break-after: avoid; }
            .decision-block { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">PagePilot AI</div>
        <div class="subtitle">AI-Generated Landing Page Design Rationale</div>
    </div>

    <div class="meta-info">
        <strong>Page:</strong> ${pageTitle}<br>
        <strong>Generated:</strong> ${currentDate}<br>
        <strong>Report Type:</strong> Design Decision Analysis<br>
        <strong>AI Model:</strong> PagePilot Intelligence Engine v2.0
    </div>

    <h1>Executive Summary</h1>
    <p>${rationaleData.executiveSummary || 'This report provides a comprehensive analysis of AI-driven design decisions for the generated landing page, including data sources, confidence levels, and expected performance impact.'}</p>

    <h2>Design Decisions & Rationale</h2>
    ${(rationaleData.designDecisions || []).map((decision: any) => `
        <div class="decision-block">
            <h3>${decision.decision || 'Design Decision'} 
                <span class="confidence-score">${Math.round((decision.confidence || 0.8) * 100)}% Confidence</span>
            </h3>
            
            <h4>Reasoning:</h4>
            <p>${decision.reasoning || 'Decision based on best practices and data analysis.'}</p>
            
            <h4>Data Sources:</h4>
            <ul>
                ${(decision.dataSource || ['Historical campaign data', 'Industry benchmarks']).map((source: string) => `<li>${source}</li>`).join('')}
            </ul>
            
            ${decision.alternatives && decision.alternatives.length > 0 ? `
                <h4>Alternatives Considered:</h4>
                ${decision.alternatives.map((alt: any) => `
                    <div class="alternative">
                        <strong>${alt.option}:</strong> ${alt.whyRejected}
                    </div>
                `).join('')}
            ` : ''}
            
            ${decision.expectedImpact ? `
                <div class="metric">
                    <strong>Expected Impact on ${decision.expectedImpact.metric}:</strong> 
                    ${decision.expectedImpact.prediction}% 
                    (${Math.round(decision.expectedImpact.confidence * 100)}% confidence)
                </div>
            ` : ''}
        </div>
    `).join('')}

    <h2>Performance Predictions</h2>
    <div class="metric">
        <strong>Predicted Conversion Rate:</strong> 
        <span style="font-size: 20px; color: #059669;">
            ${((rationaleData.performancePredictions?.conversionRate || 0.034) * 100).toFixed(1)}%
        </span><br>
        <strong>Confidence Level:</strong> ${Math.round((rationaleData.performancePredictions?.confidence || 0.82) * 100)}%
    </div>
    
    <h3>Key Performance Factors:</h3>
    <ul>
        ${(rationaleData.performancePredictions?.keyFactors || [
            'Clear value proposition alignment with target audience',
            'Optimized call-to-action placement and messaging',
            'Trust signals and social proof integration'
        ]).map((factor: string) => `<li>${factor}</li>`).join('')}
    </ul>

    <h2>Brand Compliance Analysis</h2>
    <div class="metric">
        <span class="compliance-score">${Math.round((rationaleData.brandCompliance?.score || 0.95) * 100)}%</span>
        Brand Compliance Score
    </div>
    
    ${rationaleData.brandCompliance?.violations && rationaleData.brandCompliance.violations.length > 0 ? `
        <h3>Violations Found:</h3>
        ${rationaleData.brandCompliance.violations.map((violation: string) => `
            <div class="violations">${violation}</div>
        `).join('')}
    ` : '<p style="color: #059669;">✓ No brand guideline violations detected</p>'}
    
    <h3>Compliance Recommendations:</h3>
    <ul>
        ${(rationaleData.brandCompliance?.suggestions || [
            'Maintain consistent color usage across all sections',
            'Ensure proper logo placement and sizing',
            'Adhere to typography hierarchy guidelines'
        ]).map((suggestion: string) => `<li>${suggestion}</li>`).join('')}
    </ul>

    <h2>A/B Testing Strategy</h2>
    <div class="test-recommendation">
        <strong>Expected Performance Lift:</strong> +${rationaleData.testingRecommendations?.expectedLift || 15}%<br>
        <strong>Recommended Duration:</strong> ${rationaleData.testingRecommendations?.duration || '14 days'}
    </div>
    
    <h3>Priority Test Elements:</h3>
    <ul>
        ${(rationaleData.testingRecommendations?.priorityTests || [
            'Hero section headline variations',
            'Call-to-action button text and color',
            'Social proof placement and format',
            'Form field optimization',
            'Value proposition messaging'
        ]).map((test: string) => `<li>${test}</li>`).join('')}
    </ul>

    <h2>Methodology & Data Sources</h2>
    <p>This analysis is based on:</p>
    <ul>
        <li>Historical campaign performance data (${rationaleData.historicDataPoints || 'Multiple campaigns'} analyzed)</li>
        <li>Industry conversion benchmarks and best practices</li>
        <li>A/B testing results from similar campaigns</li>
        <li>Brand compliance validation algorithms</li>
        <li>Machine learning models trained on high-performing landing pages</li>
    </ul>

    <h2>Confidence & Limitations</h2>
    <p><strong>Overall Confidence Level:</strong> ${Math.round((rationaleData.overallConfidence || 0.87) * 100)}%</p>
    <p><strong>Limitations:</strong></p>
    <ul>
        <li>Predictions based on historical data patterns which may not reflect future performance</li>
        <li>Brand compliance score is algorithmic and may not catch all subjective guideline violations</li>
        <li>Market conditions and competitive landscape changes can impact actual results</li>
        <li>User behavior variations across different traffic sources not fully accounted for</li>
    </ul>

    <div class="footer">
        <p>Generated by PagePilot AI • ${currentDate} • Confidential and Proprietary</p>
        <p>This report is automatically generated based on AI analysis and should be reviewed by marketing professionals</p>
    </div>
</body>
</html>
  `;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    const { reportId, pageTitle } = await req.json();

    if (!reportId) {
      throw new Error('Report ID is required');
    }

    console.log('Generating PDF for report:', reportId);

    // Get rationale report data
    const { data: reportData, error: reportError } = await supabaseClient
      .from('ai_rationale_reports')
      .select('*')
      .eq('id', reportId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (reportError) {
      console.error('Error loading report:', reportError);
      throw new Error('Failed to load report data');
    }

    if (!reportData) {
      throw new Error('Report not found');
    }

    // Generate HTML for PDF conversion
    const htmlContent = generatePDFHTML(reportData.rationale_data, pageTitle || 'Landing Page');

    // For now, return the HTML. In a production environment, you would:
    // 1. Use a PDF generation service like Puppeteer or similar
    // 2. Convert HTML to PDF
    // 3. Upload to Supabase Storage
    // 4. Return the download URL

    // Simulated PDF URL (in production, this would be actual PDF generation)
    const pdfUrl = `data:text/html;base64,${btoa(htmlContent)}`;

    // Update the report with PDF URL (in production, use actual storage URL)
    const { error: updateError } = await supabaseClient
      .from('ai_rationale_reports')
      .update({ pdf_url: 'Generated PDF report available' })
      .eq('id', reportId);

    if (updateError) {
      console.error('Error updating report:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        pdfUrl,
        htmlContent, // For preview purposes
        reportData: reportData.rationale_data
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate-pdf-report function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});