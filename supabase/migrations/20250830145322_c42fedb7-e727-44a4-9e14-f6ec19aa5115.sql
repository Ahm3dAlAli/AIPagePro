-- Enhanced schema for sophisticated PagePilot AI features

-- Add section-level control columns to generated_pages
ALTER TABLE generated_pages 
ADD COLUMN sections_config JSONB DEFAULT '{}',
ADD COLUMN generation_prompts JSONB DEFAULT '{}',
ADD COLUMN ai_rationale TEXT,
ADD COLUMN performance_score NUMERIC DEFAULT 0;

-- Create page_sections table for individual section management
CREATE TABLE IF NOT EXISTS page_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES generated_pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  section_type TEXT NOT NULL, -- 'hero', 'benefits', 'features', etc.
  content JSONB NOT NULL,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  ai_prompt TEXT,
  performance_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on page_sections
ALTER TABLE page_sections ENABLE ROW LEVEL SECURITY;

-- Create policies for page_sections
CREATE POLICY "Users can manage their own page sections" 
ON page_sections FOR ALL 
USING (auth.uid() = user_id);

-- Create analytics_events table for detailed tracking
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES generated_pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL, -- 'page_view', 'cta_click', 'form_submit', etc.
  event_data JSONB DEFAULT '{}',
  visitor_id TEXT,
  session_id TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Enable RLS on analytics_events
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Create policies for analytics_events
CREATE POLICY "Users can view their own analytics events" 
ON analytics_events FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can insert analytics events" 
ON analytics_events FOR INSERT 
WITH CHECK (true); -- Allow public insertion for tracking

-- Enhance templates table with more features
ALTER TABLE templates 
ADD COLUMN performance_metrics JSONB DEFAULT '{}',
ADD COLUMN usage_count INTEGER DEFAULT 0,
ADD COLUMN industry_category TEXT,
ADD COLUMN complexity_score INTEGER DEFAULT 1,
ADD COLUMN ai_optimized BOOLEAN DEFAULT FALSE,
ADD COLUMN template_type TEXT DEFAULT 'custom'; -- 'system', 'custom', 'community'

-- Create template_sections table for modular templates
CREATE TABLE IF NOT EXISTS template_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  section_type TEXT NOT NULL,
  section_config JSONB NOT NULL,
  order_index INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on template_sections
ALTER TABLE template_sections ENABLE ROW LEVEL SECURITY;

-- Create policies for template_sections
CREATE POLICY "Users can manage their template sections" 
ON template_sections FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view public template sections" 
ON template_sections FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM templates t 
    WHERE t.id = template_sections.template_id 
    AND t.is_public = TRUE
  )
);

-- Create performance_reports table for AI insights
CREATE TABLE IF NOT EXISTS performance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES generated_pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  report_type TEXT NOT NULL, -- 'weekly', 'monthly', 'campaign'
  metrics JSONB NOT NULL,
  ai_insights TEXT,
  recommendations JSONB DEFAULT '[]',
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on performance_reports
ALTER TABLE performance_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for performance_reports
CREATE POLICY "Users can view their own performance reports" 
ON performance_reports FOR ALL 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_page_sections_page_id ON page_sections(page_id);
CREATE INDEX IF NOT EXISTS idx_page_sections_type ON page_sections(section_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_page_id ON analytics_events(page_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_template_sections_template_id ON template_sections(template_id);
CREATE INDEX IF NOT EXISTS idx_performance_reports_page_id ON performance_reports(page_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_page_sections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for page sections updated_at
CREATE TRIGGER update_page_sections_updated_at
  BEFORE UPDATE ON page_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_page_sections_updated_at();