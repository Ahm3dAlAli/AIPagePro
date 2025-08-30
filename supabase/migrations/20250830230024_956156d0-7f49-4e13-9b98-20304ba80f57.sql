-- Create historic campaign data table
CREATE TABLE public.historic_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  campaign_name TEXT NOT NULL,
  campaign_id TEXT,
  landing_page_url TEXT,
  traffic_source TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  device_type TEXT,
  creative_id TEXT,
  creative_name TEXT,
  creative_type TEXT,
  sessions INTEGER DEFAULT 0,
  users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  bounce_rate NUMERIC DEFAULT 0,
  engagement_rate NUMERIC DEFAULT 0,
  avg_time_on_page INTEGER DEFAULT 0,
  scroll_depth NUMERIC DEFAULT 0,
  primary_cta_clicks INTEGER DEFAULT 0,
  form_views INTEGER DEFAULT 0,
  form_starters INTEGER DEFAULT 0,
  form_completions INTEGER DEFAULT 0,
  form_abandonment_rate NUMERIC DEFAULT 0,
  primary_conversions INTEGER DEFAULT 0,
  primary_conversion_rate NUMERIC DEFAULT 0,
  secondary_conversions INTEGER DEFAULT 0,
  cost_per_session NUMERIC DEFAULT 0,
  cost_per_conversion NUMERIC DEFAULT 0,
  total_spend NUMERIC DEFAULT 0,
  lead_to_sql_rate NUMERIC DEFAULT 0,
  sql_to_opportunity_rate NUMERIC DEFAULT 0,
  opportunity_to_close_rate NUMERIC DEFAULT 0,
  customer_acquisition_cost NUMERIC DEFAULT 0,
  campaign_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.historic_campaigns ENABLE ROW LEVEL SECURITY;

-- Create policies for historic campaigns
CREATE POLICY "Users can manage their own campaign data" 
ON public.historic_campaigns 
FOR ALL 
USING (auth.uid() = user_id);

-- Create experiment results table
CREATE TABLE public.experiment_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  experiment_name TEXT NOT NULL,
  experiment_id TEXT UNIQUE,
  owner TEXT,
  hypothesis TEXT,
  start_date DATE,
  end_date DATE,
  audience_targeted TEXT,
  traffic_allocation TEXT,
  sample_size_control INTEGER,
  sample_size_variant INTEGER,
  control_description TEXT,
  variant_description TEXT,
  primary_metric TEXT,
  secondary_metrics TEXT[],
  control_result_primary NUMERIC,
  variant_result_primary NUMERIC,
  delta_absolute NUMERIC,
  uplift_relative NUMERIC,
  statistical_significance BOOLEAN DEFAULT false,
  p_value NUMERIC,
  winning_variant TEXT,
  decision_taken TEXT,
  key_insights TEXT,
  projected_business_impact TEXT,
  limitations_notes TEXT,
  future_recommendations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.experiment_results ENABLE ROW LEVEL SECURITY;

-- Create policies for experiment results
CREATE POLICY "Users can manage their own experiment results" 
ON public.experiment_results 
FOR ALL 
USING (auth.uid() = user_id);

-- Create brand guidelines table
CREATE TABLE public.brand_guidelines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  brand_name TEXT NOT NULL DEFAULT 'DIFC',
  primary_colors JSONB NOT NULL DEFAULT '{}',
  secondary_colors JSONB NOT NULL DEFAULT '{}',
  fonts JSONB NOT NULL DEFAULT '{}',
  logo_guidelines JSONB NOT NULL DEFAULT '{}',
  tone_of_voice TEXT,
  messaging_guidelines TEXT,
  visual_style_notes TEXT,
  compliance_requirements TEXT,
  usage_examples JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.brand_guidelines ENABLE ROW LEVEL SECURITY;

-- Create policies for brand guidelines
CREATE POLICY "Users can manage their own brand guidelines" 
ON public.brand_guidelines 
FOR ALL 
USING (auth.uid() = user_id);

-- Create AI rationale reports table
CREATE TABLE public.ai_rationale_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  page_id UUID NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'design_rationale',
  rationale_data JSONB NOT NULL DEFAULT '{}',
  pdf_url TEXT,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ai_rationale_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for AI rationale reports
CREATE POLICY "Users can manage their own rationale reports" 
ON public.ai_rationale_reports 
FOR ALL 
USING (auth.uid() = user_id);

-- Create component exports table for Sitecore BYOC
CREATE TABLE public.component_exports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  page_id UUID,
  component_name TEXT NOT NULL,
  component_type TEXT NOT NULL,
  react_code TEXT NOT NULL,
  json_schema JSONB NOT NULL DEFAULT '{}',
  sitecore_manifest JSONB NOT NULL DEFAULT '{}',
  export_format TEXT DEFAULT 'react_tsx',
  is_public BOOLEAN DEFAULT false,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.component_exports ENABLE ROW LEVEL SECURITY;

-- Create policies for component exports
CREATE POLICY "Users can manage their own component exports" 
ON public.component_exports 
FOR ALL 
USING (auth.uid() = user_id);

-- Create deployment records table
CREATE TABLE public.deployment_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  page_id UUID NOT NULL,
  deployment_platform TEXT NOT NULL,
  deployment_url TEXT,
  deployment_status TEXT DEFAULT 'pending',
  deployment_config JSONB NOT NULL DEFAULT '{}',
  error_logs TEXT,
  deployed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.deployment_records ENABLE ROW LEVEL SECURITY;

-- Create policies for deployment records
CREATE POLICY "Users can manage their own deployment records" 
ON public.deployment_records 
FOR ALL 
USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_historic_campaigns_user_date ON public.historic_campaigns(user_id, campaign_date);
CREATE INDEX idx_experiment_results_user_id ON public.experiment_results(user_id);
CREATE INDEX idx_ai_rationale_reports_page_id ON public.ai_rationale_reports(page_id);
CREATE INDEX idx_component_exports_user_page ON public.component_exports(user_id, page_id);
CREATE INDEX idx_deployment_records_page_id ON public.deployment_records(page_id);

-- Create triggers for updated_at
CREATE TRIGGER update_historic_campaigns_updated_at
BEFORE UPDATE ON public.historic_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_experiment_results_updated_at
BEFORE UPDATE ON public.experiment_results
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_brand_guidelines_updated_at
BEFORE UPDATE ON public.brand_guidelines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_rationale_reports_updated_at
BEFORE UPDATE ON public.ai_rationale_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_component_exports_updated_at
BEFORE UPDATE ON public.component_exports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_deployment_records_updated_at
BEFORE UPDATE ON public.deployment_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();