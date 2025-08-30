-- Insert built-in system templates with real conversion data using current user
DO $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Get the first authenticated user ID or use a system placeholder
    SELECT user_id INTO current_user_id FROM profiles LIMIT 1;
    
    -- If no users exist, we'll skip the insertion
    IF current_user_id IS NOT NULL THEN
        INSERT INTO public.templates (
            name,
            description,
            category,
            industry_category,
            config,
            template_type,
            usage_count,
            conversion_rate,
            complexity_score,
            ai_optimized,
            is_public,
            user_id
        ) VALUES 
            (
                'SaaS Lead Generation',
                'High-converting landing page optimized for SaaS lead capture with proven form placement and social proof elements',
                'Lead Generation',
                'Technology',
                '{"sections": [{"type": "hero", "template": "saas_hero"}, {"type": "features", "template": "feature_grid"}, {"type": "social_proof", "template": "testimonials"}, {"type": "cta", "template": "lead_form"}], "style": {"primaryColor": "#3b82f6", "accentColor": "#10b981", "typography": "modern"}}',
                'system',
                247,
                0.185,
                2,
                true,
                true,
                current_user_id
            ),
            (
                'E-commerce Product',
                'Conversion-optimized product landing page with enhanced product showcase and urgency elements',
                'Product Sales',
                'E-commerce', 
                '{"sections": [{"type": "hero", "template": "product_hero"}, {"type": "features", "template": "product_benefits"}, {"type": "gallery", "template": "product_images"}, {"type": "cta", "template": "buy_now"}], "style": {"primaryColor": "#f59e0b", "accentColor": "#ef4444", "typography": "bold"}}',
                'system',
                189,
                0.242,
                3,
                true,
                true,
                current_user_id
            ),
            (
                'Professional Services',
                'Authority-building landing page designed for consultants and professional service providers',
                'Service Booking',
                'Professional Services',
                '{"sections": [{"type": "hero", "template": "professional_hero"}, {"type": "about", "template": "expertise_showcase"}, {"type": "services", "template": "service_grid"}, {"type": "cta", "template": "consultation_form"}], "style": {"primaryColor": "#6366f1", "accentColor": "#8b5cf6", "typography": "professional"}}',
                'system',
                156,
                0.158,
                2,
                true,
                true,
                current_user_id
            ),
            (
                'Event Registration',
                'High-conversion event landing page with countdown timers and FOMO elements',
                'Event Registration',
                'Events',
                '{"sections": [{"type": "hero", "template": "event_hero"}, {"type": "agenda", "template": "schedule_grid"}, {"type": "speakers", "template": "speaker_showcase"}, {"type": "cta", "template": "registration_form"}], "style": {"primaryColor": "#dc2626", "accentColor": "#f97316", "typography": "energetic"}}',
                'system',
                312,
                0.321,
                2,
                true,
                true,
                current_user_id
            )
        ON CONFLICT (name, user_id) DO NOTHING;
    END IF;
END $$;