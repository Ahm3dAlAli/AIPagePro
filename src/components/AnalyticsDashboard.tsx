import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  MousePointer, 
  Eye,
  Target,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Download,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts';

interface AnalyticsData {
  id: string;
  page_id: string;
  date: string;
  sessions: number;
  users: number;
  conversions: number;
  conversion_rate: number;
  cta_clicks: number;
  avg_time_on_page: number;
  bounce_rate: number;
  form_views: number;
  form_starts: number;
  form_completions: number;
}

interface AnalyticsDashboardProps {
  pageId?: string;
  showAllPages?: boolean;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ 
  pageId, 
  showAllPages = false 
}) => {
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState('sessions');

  useEffect(() => {
    loadAnalytics();
  }, [pageId, dateRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('analytics_data')
        .select('*')
        .order('date', { ascending: true });

      if (pageId && !showAllPages) {
        query = query.eq('page_id', pageId);
      }

      // Add date range filter
      const endDate = new Date();
      const startDate = new Date();
      
      switch (dateRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
      }

      query = query
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      const { data, error } = await query;

      if (error) throw error;
      setAnalytics(data || []);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    try {
      toast({
        title: "Generating Report",
        description: "AI is analyzing your performance data..."
      });

      const { data, error } = await supabase.functions.invoke('generate-performance-report', {
        body: { pageId, dateRange }
      });

      if (error) throw error;

      toast({
        title: "Report Generated",
        description: "Performance report has been created with AI insights."
      });
    } catch (error: any) {
      toast({
        title: "Report Failed",
        description: error.message || "Failed to generate report",
        variant: "destructive"
      });
    }
  };

  const calculateTrend = (metric: string) => {
    if (analytics.length < 2) return { value: 0, direction: 'neutral' };
    
    const recent = analytics.slice(-3);
    const previous = analytics.slice(-6, -3);
    
    const recentAvg = recent.reduce((sum, item) => sum + (item[metric as keyof AnalyticsData] as number || 0), 0) / recent.length;
    const previousAvg = previous.reduce((sum, item) => sum + (item[metric as keyof AnalyticsData] as number || 0), 0) / previous.length;
    
    if (previousAvg === 0) return { value: 0, direction: 'neutral' };
    
    const change = ((recentAvg - previousAvg) / previousAvg) * 100;
    return {
      value: Math.abs(change),
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
    };
  };

  const getTotalMetric = (metric: string) => {
    return analytics.reduce((sum, item) => sum + (item[metric as keyof AnalyticsData] as number || 0), 0);
  };

  const getAverageMetric = (metric: string) => {
    if (analytics.length === 0) return 0;
    return getTotalMetric(metric) / analytics.length;
  };

  const formatMetric = (value: number, type: string) => {
    switch (type) {
      case 'percentage':
        return `${(value * 100).toFixed(1)}%`;
      case 'time':
        return `${Math.round(value)}s`;
      case 'currency':
        return `$${value.toFixed(2)}`;
      default:
        return Math.round(value).toLocaleString();
    }
  };

  const metricsCards = [
    {
      title: 'Total Sessions',
      value: getTotalMetric('sessions'),
      format: 'number',
      icon: Users,
      trend: calculateTrend('sessions')
    },
    {
      title: 'Conversion Rate',
      value: getAverageMetric('conversion_rate'),
      format: 'percentage',
      icon: Target,
      trend: calculateTrend('conversion_rate')
    },
    {
      title: 'CTA Clicks',
      value: getTotalMetric('cta_clicks'),
      format: 'number',
      icon: MousePointer,
      trend: calculateTrend('cta_clicks')
    },
    {
      title: 'Avg. Time on Page',
      value: getAverageMetric('avg_time_on_page'),
      format: 'time',
      icon: Clock,
      trend: calculateTrend('avg_time_on_page')
    },
    {
      title: 'Total Conversions',
      value: getTotalMetric('conversions'),
      format: 'number',
      icon: Zap,
      trend: calculateTrend('conversions')
    },
    {
      title: 'Bounce Rate',
      value: getAverageMetric('bounce_rate'),
      format: 'percentage',
      icon: Eye,
      trend: calculateTrend('bounce_rate')
    }
  ];

  const chartData = analytics.map(item => ({
    date: new Date(item.date).toLocaleDateString(),
    sessions: item.sessions,
    conversions: item.conversions,
    conversionRate: item.conversion_rate * 100,
    ctaClicks: item.cta_clicks,
    bounceRate: item.bounce_rate * 100
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Performance insights and AI-powered recommendations
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={generateReport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            AI Report
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metricsCards.map((metric, index) => {
          const Icon = metric.icon;
          const trend = metric.trend;
          
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {metric.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatMetric(metric.value, metric.format)}
                </div>
                {trend.direction !== 'neutral' && (
                  <div className="flex items-center text-xs text-muted-foreground">
                    {trend.direction === 'up' ? (
                      <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-red-600 mr-1" />
                    )}
                    <span className={trend.direction === 'up' ? 'text-green-600' : 'text-red-600'}>
                      {trend.value.toFixed(1)}%
                    </span>
                    <span className="ml-1">vs previous period</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="conversions">Conversions</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Sessions Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="sessions" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Conversion Rate Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Conversion Rate']} />
                    <Line 
                      type="monotone" 
                      dataKey="conversionRate" 
                      stroke="hsl(var(--success))" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="conversions">
          <Card>
            <CardHeader>
              <CardTitle>Conversion Funnel</CardTitle>
              <CardDescription>Track user journey from view to conversion</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="sessions" fill="hsl(var(--primary))" name="Sessions" />
                  <Bar dataKey="ctaClicks" fill="hsl(var(--accent))" name="CTA Clicks" />
                  <Bar dataKey="conversions" fill="hsl(var(--success))" name="Conversions" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Bounce Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Bounce Rate']} />
                    <Line 
                      type="monotone" 
                      dataKey="bounceRate" 
                      stroke="hsl(var(--warning))" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Form Completion Rate</span>
                    <Badge variant="secondary">
                      {analytics.length > 0 ? 
                        `${((getTotalMetric('form_completions') / Math.max(getTotalMetric('form_views'), 1)) * 100).toFixed(1)}%` : 
                        '0%'
                      }
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Click-through Rate</span>
                    <Badge variant="secondary">
                      {analytics.length > 0 ? 
                        `${((getTotalMetric('cta_clicks') / Math.max(getTotalMetric('sessions'), 1)) * 100).toFixed(1)}%` : 
                        '0%'
                      }
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Avg. Session Duration</span>
                    <Badge variant="secondary">
                      {formatMetric(getAverageMetric('avg_time_on_page'), 'time')}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};