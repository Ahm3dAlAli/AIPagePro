import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, Target, Smartphone, Monitor, Tablet, DollarSign, MousePointer, FormInput, BarChart3, Lightbulb, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
interface DataInsights {
  topPerformingChannels: Array<{
    channel: string;
    conversionRate: number;
    sessions: number;
    conversions: number;
    spend: number;
  }>;
  bestConvertingFormPosition: string;
  optimalCTAText: string;
  highPerformingDevices: Array<{
    device: string;
    conversionRate: number;
  }>;
  averageConversionRate: number;
  totalCampaigns: number;
  totalSpend: number;
  totalConversions: number;
  experimentInsights: Array<{
    experiment: string;
    uplift: number;
    insight: string;
  }>;
}
const DataDrivenInsights: React.FC = () => {
  const [insights, setInsights] = useState<DataInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const {
    toast
  } = useToast();
  useEffect(() => {
    loadInsights();
  }, []);
  const loadInsights = async () => {
    try {
      setLoading(true);

      // Fetch historic campaign data
      const {
        data: historicData,
        error: historicError
      } = await supabase.from('historic_campaigns').select('*').order('campaign_date', {
        ascending: false
      }).limit(50);
      if (historicError) throw historicError;

      // Fetch experiment results
      const {
        data: experimentData,
        error: experimentError
      } = await supabase.from('experiment_results').select('*').eq('statistical_significance', true).order('end_date', {
        ascending: false
      }).limit(10);
      if (experimentError) throw experimentError;

      // Analyze the data
      const analyzedInsights = analyzeData(historicData || [], experimentData || []);
      setInsights(analyzedInsights);
    } catch (error: any) {
      console.error('Error loading insights:', error);
      toast({
        title: "Error",
        description: "Failed to load data insights",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const analyzeData = (historicData: any[], experimentData: any[]): DataInsights => {
    // Analyze top performing channels
    const channelPerformance = historicData.reduce((acc: any, campaign: any) => {
      const channel = campaign.utm_source || 'direct';
      if (!acc[channel]) {
        acc[channel] = {
          sessions: 0,
          conversions: 0,
          spend: 0
        };
      }
      acc[channel].sessions += campaign.sessions || 0;
      acc[channel].conversions += campaign.primary_conversions || 0;
      acc[channel].spend += campaign.total_spend || 0;
      return acc;
    }, {});
    const topPerformingChannels = Object.entries(channelPerformance).map(([channel, data]: [string, any]) => ({
      channel,
      conversionRate: data.sessions > 0 ? data.conversions / data.sessions : 0,
      ...data
    })).sort((a: any, b: any) => b.conversionRate - a.conversionRate).slice(0, 5);

    // Analyze device performance
    const devicePerformance = historicData.reduce((acc: any, campaign: any) => {
      const device = campaign.device_type || 'desktop';
      if (!acc[device]) {
        acc[device] = {
          sessions: 0,
          conversions: 0
        };
      }
      acc[device].sessions += campaign.sessions || 0;
      acc[device].conversions += campaign.primary_conversions || 0;
      return acc;
    }, {});
    const highPerformingDevices = Object.entries(devicePerformance).map(([device, data]: [string, any]) => ({
      device,
      conversionRate: data.sessions > 0 ? data.conversions / data.sessions : 0
    })).sort((a: any, b: any) => b.conversionRate - a.conversionRate);

    // Calculate totals
    const totalSessions = historicData.reduce((sum, c) => sum + (c.sessions || 0), 0);
    const totalConversions = historicData.reduce((sum, c) => sum + (c.primary_conversions || 0), 0);
    const totalSpend = historicData.reduce((sum, c) => sum + (c.total_spend || 0), 0);
    const averageConversionRate = totalSessions > 0 ? totalConversions / totalSessions : 0;

    // Extract experiment insights
    const experimentInsights = experimentData.map((exp: any) => ({
      experiment: exp.experiment_name || 'Untitled Experiment',
      uplift: exp.uplift_relative || 0,
      insight: exp.key_insights ? exp.key_insights.substring(0, 100) + '...' : 'No insights available'
    }));

    // Determine best practices from experiments
    let bestConvertingFormPosition = 'middle';
    let optimalCTAText = 'Get Started';
    const formExperiment = experimentData.find((exp: any) => exp.experiment_name?.toLowerCase().includes('form') || exp.primary_metric?.toLowerCase().includes('form'));
    if (formExperiment && formExperiment.winning_variant) {
      bestConvertingFormPosition = formExperiment.winning_variant.includes('hero') ? 'hero' : 'middle';
    }
    const ctaExperiment = experimentData.find((exp: any) => exp.experiment_name?.toLowerCase().includes('cta') || exp.experiment_name?.toLowerCase().includes('button'));
    if (ctaExperiment && ctaExperiment.variant_description) {
      // Try to extract CTA text from experiment description
      const ctaMatch = ctaExperiment.variant_description.match(/"([^"]*(?:button|cta)[^"]*)"/i);
      if (ctaMatch) {
        optimalCTAText = ctaMatch[1];
      }
    }
    return {
      topPerformingChannels,
      bestConvertingFormPosition,
      optimalCTAText,
      highPerformingDevices,
      averageConversionRate,
      totalCampaigns: historicData.length,
      totalSpend,
      totalConversions,
      experimentInsights
    };
  };
  const getDeviceIcon = (device: string) => {
    switch (device.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Tablet className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };
  const getChannelColor = (index: number) => {
    const colors = ['bg-blue-100 text-blue-800', 'bg-green-100 text-green-800', 'bg-purple-100 text-purple-800', 'bg-orange-100 text-orange-800', 'bg-pink-100 text-pink-800'];
    return colors[index % colors.length];
  };
  if (loading) {
    return <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>;
  }
  if (!insights || insights.totalCampaigns === 0) {
    return <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Data-Driven Insights
          </CardTitle>
          <CardDescription>
            AI will use your campaign data to optimize landing page generation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No data available</h3>
            <p className="text-muted-foreground mb-4">
              Import your historic campaign data to see AI-powered insights and optimizations
            </p>
            <Button variant="outline" onClick={loadInsights}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>;
  }
  return <div className="space-y-6">
      {/* Overview Cards */}
      

      {/* AI Optimizations */}
      

      {/* Top Performing Channels */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Channels</CardTitle>
          <CardDescription>
            Channels ranked by conversion rate - AI uses this to optimize messaging
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {insights.topPerformingChannels.slice(0, 5).map((channel, index) => <div key={channel.channel} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge className={getChannelColor(index)}>
                    #{index + 1}
                  </Badge>
                  <div>
                    <p className="font-medium capitalize">{channel.channel}</p>
                    <p className="text-sm text-muted-foreground">
                      {channel.sessions.toLocaleString()} sessions, {channel.conversions} conversions
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{(channel.conversionRate * 100).toFixed(2)}%</p>
                  <p className="text-sm text-muted-foreground">
                    ${(channel.spend || 0).toLocaleString()} spent
                  </p>
                </div>
              </div>)}
          </div>
        </CardContent>
      </Card>

      {/* Device Performance */}
      

      {/* Experiment Insights */}
      {insights.experimentInsights.length > 0 && <Card>
          <CardHeader>
            <CardTitle>Experiment Learnings</CardTitle>
            <CardDescription>
              Key insights from your A/B tests that AI will apply to new pages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.experimentInsights.map((exp, index) => <div key={index} className="flex items-start gap-3 p-4 border rounded-lg">
                  {exp.uplift > 0 ? <CheckCircle className="h-5 w-5 text-green-600 mt-1" /> : <AlertTriangle className="h-5 w-5 text-orange-600 mt-1" />}
                  <div className="flex-1">
                    <h4 className="font-medium">{exp.experiment}</h4>
                    <p className="text-sm text-muted-foreground mb-2">{exp.insight}</p>
                    <Badge variant={exp.uplift > 0 ? "default" : "secondary"}>
                      {exp.uplift > 0 ? `+${exp.uplift.toFixed(1)}% uplift` : 'No significant change'}
                    </Badge>
                  </div>
                </div>)}
            </div>
          </CardContent>
        </Card>}
    </div>;
};
export default DataDrivenInsights;