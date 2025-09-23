import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface ImportStats {
  total: number;
  imported: number;
  errors: number;
}

export interface ImportedData {
  campaigns: any[];
  experiments: any[];
}

export const useDataImport = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [importStats, setImportStats] = useState<ImportStats>({ total: 0, imported: 0, errors: 0 });
  const { toast } = useToast();

  const validateAndCleanData = (data: any[], type: 'campaigns' | 'experiments') => {
    return data.map(item => {
      if (type === 'campaigns') {
        // Ensure required fields for campaign data
        return {
          ...item,
          campaign_name: item.campaign_name || 'Imported Campaign',
          campaign_date: item.campaign_date || new Date().toISOString().split('T')[0],
          sessions: parseInt(item.sessions) || 0,
          users: parseInt(item.users) || 0,
          bounce_rate: parseFloat(item.bounce_rate) || 0,
          primary_conversion_rate: parseFloat(item.primary_conversion_rate) || 0,
          primary_conversions: parseInt(item.primary_conversions) || 0,
          avg_time_on_page: parseInt(item.avg_time_on_page) || 0,
          utm_source: item.utm_source || 'direct',
          traffic_source: item.traffic_source || 'direct'
        };
      } else {
        // Ensure required fields for experiment data
        return {
          ...item,
          experiment_name: item.experiment_name || 'Imported Experiment',
          start_date: item.start_date || new Date().toISOString().split('T')[0],
          end_date: item.end_date || new Date().toISOString().split('T')[0],
          statistical_significance: Boolean(item.statistical_significance),
          uplift_relative: parseFloat(item.uplift_relative) || 0,
          control_result_primary: parseFloat(item.control_result_primary) || 0,
          variant_result_primary: parseFloat(item.variant_result_primary) || 0,
          winning_variant: item.winning_variant || 'A'
        };
      }
    });
  };

  const importData = async (data: any[], type: 'campaigns' | 'experiments'): Promise<boolean> => {
    setIsImporting(true);
    setImportStats({ total: data.length, imported: 0, errors: 0 });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Error",
          description: "Please log in to import data",
          variant: "destructive"
        });
        return false;
      }

      // Clean and validate data
      const cleanData = validateAndCleanData(data, type);
      const dataWithUserId = cleanData.map(item => ({ ...item, user_id: user.id }));

      let imported = 0;
      let errors = 0;

      // Import in batches to avoid overwhelming the database
      const batchSize = 20;
      for (let i = 0; i < dataWithUserId.length; i += batchSize) {
        const batch = dataWithUserId.slice(i, i + batchSize);
        
        try {
          const tableName = type === 'campaigns' ? 'historic_campaigns' : 'experiment_results';
          const { data: insertedData, error } = await supabase
            .from(tableName)
            .insert(batch)
            .select();

          if (error) {
            console.error(`Batch insert error for ${type}:`, error);
            errors += batch.length;
          } else {
            imported += insertedData?.length || 0;
            console.log(`Successfully imported batch of ${insertedData?.length} ${type} records`);
          }
        } catch (err) {
          console.error('Batch processing error:', err);
          errors += batch.length;
        }

        setImportStats({ total: data.length, imported, errors });
      }

      const success = imported > 0;
      toast({
        title: success ? "Import Successful" : "Import Failed",
        description: `Imported ${imported} ${type} records${errors > 0 ? ` with ${errors} errors` : ''}`,
        variant: success ? "default" : "destructive"
      });

      return success;
    } catch (error: any) {
      console.error('Import process error:', error);
      toast({
        title: "Import Failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsImporting(false);
    }
  };

  const loadImportedData = async (): Promise<ImportedData> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { campaigns: [], experiments: [] };
      }

      // Load campaigns
      const { data: campaigns, error: campaignsError } = await supabase
        .from('historic_campaigns')
        .select('*')
        .eq('user_id', user.id)
        .order('campaign_date', { ascending: false });

      if (campaignsError) {
        console.error('Error loading campaigns:', campaignsError);
      }

      // Load experiments
      const { data: experiments, error: experimentsError } = await supabase
        .from('experiment_results')
        .select('*')
        .eq('user_id', user.id)
        .order('end_date', { ascending: false });

      if (experimentsError) {
        console.error('Error loading experiments:', experimentsError);
      }

      return {
        campaigns: campaigns || [],
        experiments: experiments || []
      };
    } catch (error) {
      console.error('Error loading imported data:', error);
      return { campaigns: [], experiments: [] };
    }
  };

  return {
    isImporting,
    importStats,
    importData,
    loadImportedData
  };
};