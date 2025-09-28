export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      ai_rationale_reports: {
        Row: {
          generated_at: string
          id: string
          page_id: string
          pdf_url: string | null
          rationale_data: Json
          report_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          generated_at?: string
          id?: string
          page_id: string
          pdf_url?: string | null
          rationale_data?: Json
          report_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          generated_at?: string
          id?: string
          page_id?: string
          pdf_url?: string | null
          rationale_data?: Json
          report_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      analytics_data: {
        Row: {
          avg_time_on_page: number | null
          bounce_rate: number | null
          conversion_rate: number | null
          conversions: number | null
          created_at: string
          cta_clicks: number | null
          date: string
          form_completions: number | null
          form_starts: number | null
          form_views: number | null
          id: string
          new_users: number | null
          page_id: string
          sessions: number | null
          user_id: string
          users: number | null
        }
        Insert: {
          avg_time_on_page?: number | null
          bounce_rate?: number | null
          conversion_rate?: number | null
          conversions?: number | null
          created_at?: string
          cta_clicks?: number | null
          date: string
          form_completions?: number | null
          form_starts?: number | null
          form_views?: number | null
          id?: string
          new_users?: number | null
          page_id: string
          sessions?: number | null
          user_id: string
          users?: number | null
        }
        Update: {
          avg_time_on_page?: number | null
          bounce_rate?: number | null
          conversion_rate?: number | null
          conversions?: number | null
          created_at?: string
          cta_clicks?: number | null
          date?: string
          form_completions?: number | null
          form_starts?: number | null
          form_views?: number | null
          id?: string
          new_users?: number | null
          page_id?: string
          sessions?: number | null
          user_id?: string
          users?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_data_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "generated_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          event_data: Json | null
          event_type: string
          id: string
          metadata: Json | null
          page_id: string
          session_id: string | null
          timestamp: string | null
          user_id: string
          visitor_id: string | null
        }
        Insert: {
          event_data?: Json | null
          event_type: string
          id?: string
          metadata?: Json | null
          page_id: string
          session_id?: string | null
          timestamp?: string | null
          user_id: string
          visitor_id?: string | null
        }
        Update: {
          event_data?: Json | null
          event_type?: string
          id?: string
          metadata?: Json | null
          page_id?: string
          session_id?: string | null
          timestamp?: string | null
          user_id?: string
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "generated_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_guidelines: {
        Row: {
          brand_name: string
          compliance_requirements: string | null
          created_at: string
          fonts: Json
          id: string
          is_active: boolean | null
          logo_guidelines: Json
          messaging_guidelines: string | null
          primary_colors: Json
          secondary_colors: Json
          tone_of_voice: string | null
          updated_at: string
          usage_examples: Json
          user_id: string
          visual_style_notes: string | null
        }
        Insert: {
          brand_name?: string
          compliance_requirements?: string | null
          created_at?: string
          fonts?: Json
          id?: string
          is_active?: boolean | null
          logo_guidelines?: Json
          messaging_guidelines?: string | null
          primary_colors?: Json
          secondary_colors?: Json
          tone_of_voice?: string | null
          updated_at?: string
          usage_examples?: Json
          user_id: string
          visual_style_notes?: string | null
        }
        Update: {
          brand_name?: string
          compliance_requirements?: string | null
          created_at?: string
          fonts?: Json
          id?: string
          is_active?: boolean | null
          logo_guidelines?: Json
          messaging_guidelines?: string | null
          primary_colors?: Json
          secondary_colors?: Json
          tone_of_voice?: string | null
          updated_at?: string
          usage_examples?: Json
          user_id?: string
          visual_style_notes?: string | null
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          config: Json
          created_at: string
          id: string
          name: string
          objective: string
          primary_kpi: string | null
          status: string | null
          target_audience: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          config: Json
          created_at?: string
          id?: string
          name: string
          objective: string
          primary_kpi?: string | null
          status?: string | null
          target_audience?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          name?: string
          objective?: string
          primary_kpi?: string | null
          status?: string | null
          target_audience?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      component_exports: {
        Row: {
          component_name: string
          component_type: string
          created_at: string
          download_count: number | null
          export_format: string | null
          id: string
          is_public: boolean | null
          json_schema: Json
          page_id: string | null
          react_code: string
          sitecore_manifest: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          component_name: string
          component_type: string
          created_at?: string
          download_count?: number | null
          export_format?: string | null
          id?: string
          is_public?: boolean | null
          json_schema?: Json
          page_id?: string | null
          react_code: string
          sitecore_manifest?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          component_name?: string
          component_type?: string
          created_at?: string
          download_count?: number | null
          export_format?: string | null
          id?: string
          is_public?: boolean | null
          json_schema?: Json
          page_id?: string | null
          react_code?: string
          sitecore_manifest?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deployment_records: {
        Row: {
          created_at: string
          deployed_at: string | null
          deployment_config: Json
          deployment_platform: string
          deployment_status: string | null
          deployment_url: string | null
          error_logs: string | null
          id: string
          page_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deployed_at?: string | null
          deployment_config?: Json
          deployment_platform: string
          deployment_status?: string | null
          deployment_url?: string | null
          error_logs?: string | null
          id?: string
          page_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deployed_at?: string | null
          deployment_config?: Json
          deployment_platform?: string
          deployment_status?: string | null
          deployment_url?: string | null
          error_logs?: string | null
          id?: string
          page_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      experiment_results: {
        Row: {
          audience_targeted: string | null
          control_description: string | null
          control_result_primary: number | null
          created_at: string
          decision_taken: string | null
          delta_absolute: number | null
          end_date: string | null
          experiment_id: string | null
          experiment_name: string
          future_recommendations: string | null
          hypothesis: string | null
          id: string
          key_insights: string | null
          limitations_notes: string | null
          owner: string | null
          p_value: number | null
          primary_metric: string | null
          projected_business_impact: string | null
          sample_size_control: number | null
          sample_size_variant: number | null
          secondary_metrics: string[] | null
          start_date: string | null
          statistical_significance: boolean | null
          traffic_allocation: string | null
          updated_at: string
          uplift_relative: number | null
          user_id: string
          variant_description: string | null
          variant_result_primary: number | null
          winning_variant: string | null
        }
        Insert: {
          audience_targeted?: string | null
          control_description?: string | null
          control_result_primary?: number | null
          created_at?: string
          decision_taken?: string | null
          delta_absolute?: number | null
          end_date?: string | null
          experiment_id?: string | null
          experiment_name: string
          future_recommendations?: string | null
          hypothesis?: string | null
          id?: string
          key_insights?: string | null
          limitations_notes?: string | null
          owner?: string | null
          p_value?: number | null
          primary_metric?: string | null
          projected_business_impact?: string | null
          sample_size_control?: number | null
          sample_size_variant?: number | null
          secondary_metrics?: string[] | null
          start_date?: string | null
          statistical_significance?: boolean | null
          traffic_allocation?: string | null
          updated_at?: string
          uplift_relative?: number | null
          user_id: string
          variant_description?: string | null
          variant_result_primary?: number | null
          winning_variant?: string | null
        }
        Update: {
          audience_targeted?: string | null
          control_description?: string | null
          control_result_primary?: number | null
          created_at?: string
          decision_taken?: string | null
          delta_absolute?: number | null
          end_date?: string | null
          experiment_id?: string | null
          experiment_name?: string
          future_recommendations?: string | null
          hypothesis?: string | null
          id?: string
          key_insights?: string | null
          limitations_notes?: string | null
          owner?: string | null
          p_value?: number | null
          primary_metric?: string | null
          projected_business_impact?: string | null
          sample_size_control?: number | null
          sample_size_variant?: number | null
          secondary_metrics?: string[] | null
          start_date?: string | null
          statistical_significance?: boolean | null
          traffic_allocation?: string | null
          updated_at?: string
          uplift_relative?: number | null
          user_id?: string
          variant_description?: string | null
          variant_result_primary?: number | null
          winning_variant?: string | null
        }
        Relationships: []
      }
      experiments: {
        Row: {
          control_config: Json
          created_at: string
          end_date: string | null
          hypothesis: string | null
          id: string
          name: string
          page_id: string
          results: Json | null
          start_date: string | null
          statistical_significance: boolean | null
          status: string | null
          traffic_allocation: number | null
          updated_at: string
          user_id: string
          variant_config: Json
          winner: string | null
        }
        Insert: {
          control_config: Json
          created_at?: string
          end_date?: string | null
          hypothesis?: string | null
          id?: string
          name: string
          page_id: string
          results?: Json | null
          start_date?: string | null
          statistical_significance?: boolean | null
          status?: string | null
          traffic_allocation?: number | null
          updated_at?: string
          user_id: string
          variant_config: Json
          winner?: string | null
        }
        Update: {
          control_config?: Json
          created_at?: string
          end_date?: string | null
          hypothesis?: string | null
          id?: string
          name?: string
          page_id?: string
          results?: Json | null
          start_date?: string | null
          statistical_significance?: boolean | null
          status?: string | null
          traffic_allocation?: number | null
          updated_at?: string
          user_id?: string
          variant_config?: Json
          winner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "experiments_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "generated_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_pages: {
        Row: {
          ai_rationale: string | null
          analytics_config: Json | null
          campaign_id: string | null
          content: Json
          created_at: string
          generation_prompts: Json | null
          id: string
          performance_score: number | null
          published_url: string | null
          sections_config: Json | null
          seo_config: Json | null
          slug: string
          status: string | null
          template_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_rationale?: string | null
          analytics_config?: Json | null
          campaign_id?: string | null
          content: Json
          created_at?: string
          generation_prompts?: Json | null
          id?: string
          performance_score?: number | null
          published_url?: string | null
          sections_config?: Json | null
          seo_config?: Json | null
          slug: string
          status?: string | null
          template_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_rationale?: string | null
          analytics_config?: Json | null
          campaign_id?: string | null
          content?: Json
          created_at?: string
          generation_prompts?: Json | null
          id?: string
          performance_score?: number | null
          published_url?: string | null
          sections_config?: Json | null
          seo_config?: Json | null
          slug?: string
          status?: string | null
          template_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_pages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_pages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_pages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      historic_campaigns: {
        Row: {
          avg_time_on_page: number | null
          bounce_rate: number | null
          campaign_date: string
          campaign_id: string | null
          campaign_name: string
          cost_per_conversion: number | null
          cost_per_session: number | null
          created_at: string
          creative_id: string | null
          creative_name: string | null
          creative_type: string | null
          customer_acquisition_cost: number | null
          device_type: string | null
          engagement_rate: number | null
          form_abandonment_rate: number | null
          form_completions: number | null
          form_starters: number | null
          form_views: number | null
          id: string
          landing_page_url: string | null
          lead_to_sql_rate: number | null
          new_users: number | null
          opportunity_to_close_rate: number | null
          primary_conversion_rate: number | null
          primary_conversions: number | null
          primary_cta_clicks: number | null
          scroll_depth: number | null
          secondary_conversions: number | null
          sessions: number | null
          sql_to_opportunity_rate: number | null
          total_spend: number | null
          traffic_source: string | null
          updated_at: string
          user_id: string
          users: number | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          avg_time_on_page?: number | null
          bounce_rate?: number | null
          campaign_date: string
          campaign_id?: string | null
          campaign_name: string
          cost_per_conversion?: number | null
          cost_per_session?: number | null
          created_at?: string
          creative_id?: string | null
          creative_name?: string | null
          creative_type?: string | null
          customer_acquisition_cost?: number | null
          device_type?: string | null
          engagement_rate?: number | null
          form_abandonment_rate?: number | null
          form_completions?: number | null
          form_starters?: number | null
          form_views?: number | null
          id?: string
          landing_page_url?: string | null
          lead_to_sql_rate?: number | null
          new_users?: number | null
          opportunity_to_close_rate?: number | null
          primary_conversion_rate?: number | null
          primary_conversions?: number | null
          primary_cta_clicks?: number | null
          scroll_depth?: number | null
          secondary_conversions?: number | null
          sessions?: number | null
          sql_to_opportunity_rate?: number | null
          total_spend?: number | null
          traffic_source?: string | null
          updated_at?: string
          user_id: string
          users?: number | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          avg_time_on_page?: number | null
          bounce_rate?: number | null
          campaign_date?: string
          campaign_id?: string | null
          campaign_name?: string
          cost_per_conversion?: number | null
          cost_per_session?: number | null
          created_at?: string
          creative_id?: string | null
          creative_name?: string | null
          creative_type?: string | null
          customer_acquisition_cost?: number | null
          device_type?: string | null
          engagement_rate?: number | null
          form_abandonment_rate?: number | null
          form_completions?: number | null
          form_starters?: number | null
          form_views?: number | null
          id?: string
          landing_page_url?: string | null
          lead_to_sql_rate?: number | null
          new_users?: number | null
          opportunity_to_close_rate?: number | null
          primary_conversion_rate?: number | null
          primary_conversions?: number | null
          primary_cta_clicks?: number | null
          scroll_depth?: number | null
          secondary_conversions?: number | null
          sessions?: number | null
          sql_to_opportunity_rate?: number | null
          total_spend?: number | null
          traffic_source?: string | null
          updated_at?: string
          user_id?: string
          users?: number | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      page_sections: {
        Row: {
          ai_prompt: string | null
          content: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          page_id: string
          performance_data: Json | null
          section_type: string
          updated_at: string | null
          user_id: string
          version: number | null
        }
        Insert: {
          ai_prompt?: string | null
          content: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          page_id: string
          performance_data?: Json | null
          section_type: string
          updated_at?: string | null
          user_id: string
          version?: number | null
        }
        Update: {
          ai_prompt?: string | null
          content?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          page_id?: string
          performance_data?: Json | null
          section_type?: string
          updated_at?: string | null
          user_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "page_sections_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "generated_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_reports: {
        Row: {
          ai_insights: string | null
          generated_at: string | null
          id: string
          metrics: Json
          page_id: string
          recommendations: Json | null
          report_type: string
          user_id: string
        }
        Insert: {
          ai_insights?: string | null
          generated_at?: string | null
          id?: string
          metrics: Json
          page_id: string
          recommendations?: Json | null
          report_type: string
          user_id: string
        }
        Update: {
          ai_insights?: string | null
          generated_at?: string | null
          id?: string
          metrics?: Json
          page_id?: string
          recommendations?: Json | null
          report_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_reports_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "generated_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      template_sections: {
        Row: {
          created_at: string | null
          id: string
          is_required: boolean | null
          order_index: number | null
          section_config: Json
          section_type: string
          template_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          order_index?: number | null
          section_config: Json
          section_type: string
          template_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          order_index?: number | null
          section_config?: Json
          section_type?: string
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_sections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          ai_optimized: boolean | null
          category: string
          complexity_score: number | null
          config: Json
          conversion_rate: number | null
          created_at: string
          description: string | null
          id: string
          industry_category: string | null
          is_public: boolean | null
          name: string
          performance_metrics: Json | null
          preview_url: string | null
          tags: string[] | null
          template_type: string | null
          updated_at: string
          usage_count: number | null
          user_id: string
        }
        Insert: {
          ai_optimized?: boolean | null
          category: string
          complexity_score?: number | null
          config: Json
          conversion_rate?: number | null
          created_at?: string
          description?: string | null
          id?: string
          industry_category?: string | null
          is_public?: boolean | null
          name: string
          performance_metrics?: Json | null
          preview_url?: string | null
          tags?: string[] | null
          template_type?: string | null
          updated_at?: string
          usage_count?: number | null
          user_id: string
        }
        Update: {
          ai_optimized?: boolean | null
          category?: string
          complexity_score?: number | null
          config?: Json
          conversion_rate?: number | null
          created_at?: string
          description?: string | null
          id?: string
          industry_category?: string | null
          is_public?: boolean | null
          name?: string
          performance_metrics?: Json | null
          preview_url?: string | null
          tags?: string[] | null
          template_type?: string | null
          updated_at?: string
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
