import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { 
  BarChart3, 
  TrendingUp, 
  Database, 
  Plus, 
  Upload, 
  FileText,
  Calendar,
  Users,
  Target,
  Zap,
  Download,
  Search,
  Filter
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface HistoricCampaign {
  id: string;
  campaign_name: string;
  campaign_date: string;
  traffic_source: string;
  sessions: number;
  users: number;
  primary_conversions: number;
  secondary_conversions: number;
  primary_conversion_rate: number;
  cost_per_conversion: number;
  bounce_rate: number;
  avg_time_on_page: number;
  [key: string]: any; // Allow additional properties from database
}

interface ExperimentResult {
  id: string;
  experiment_name: string;
  start_date: string;
  end_date: string;
  winning_variant: string;
  uplift_relative: number;
  statistical_significance: boolean;
  key_insights: string;
}

const HistoricDataManager = () => {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<HistoricCampaign[]>([]);
  const [experiments, setExperiments] = useState<ExperimentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importType, setImportType] = useState<'campaign' | 'experiment'>('campaign');

  useEffect(() => {
    loadHistoricData();
  }, []);

  const loadHistoricData = async () => {
    try {
      setLoading(true);
      
      // Load campaigns
      const { data: campaignData, error: campaignError } = await supabase
        .from('historic_campaigns')
        .select('*')
        .order('campaign_date', { ascending: false })
        .limit(100);

      if (campaignError) throw campaignError;

      // Load experiments
      const { data: experimentData, error: experimentError } = await supabase
        .from('experiment_results')
        .select('*')
        .order('end_date', { ascending: false })
        .limit(50);

      if (experimentError) throw experimentError;

      setCampaigns(campaignData || []);
      setExperiments(experimentData || []);
    } catch (error: any) {
      toast({
        title: "Failed to load historic data",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImportCSV = async (file: File, type: 'campaign' | 'experiment') => {
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      const records = [];
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          const record: any = {};
          headers.forEach((header, index) => {
            record[header] = values[index] || '';
          });
          records.push(record);
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      if (type === 'campaign') {
        // Map CSV data to campaign structure
        const campaignRecords = records.map(record => ({
          user_id: user.id,
          campaign_name: record.campaign_name || record.Campaign || record.name || 'Imported Campaign',
          campaign_date: record.campaign_date || record.Date || record.date || new Date().toISOString().split('T')[0],
          traffic_source: record.traffic_source || record.Source || record.source || 'Unknown',
          sessions: parseInt(record.sessions || record.Sessions || record.visits || '0'),
          users: parseInt(record.users || record.Users || record.unique_visitors || '0'),
          primary_conversions: parseInt(record.conversions || record.Conversions || record.goals || '0'),
          primary_conversion_rate: parseFloat(record.conversion_rate || record.ConversionRate || '0'),
          bounce_rate: parseFloat(record.bounce_rate || record.BounceRate || '0'),
          avg_time_on_page: parseInt(record.avg_time_on_page || record.AvgTimeOnPage || '0'),
          cost_per_conversion: parseFloat(record.cost_per_conversion || record.CostPerConversion || '0')
        }));

        const { error } = await supabase
          .from('historic_campaigns')
          .insert(campaignRecords);

        if (error) throw error;

        toast({
          title: "Campaigns imported successfully",
          description: `Imported ${campaignRecords.length} campaign records`
        });
      } else {
        // Map CSV data to experiment structure
        const experimentRecords = records.map(record => ({
          user_id: user.id,
          experiment_name: record.experiment_name || record.Experiment || record.name || 'Imported Experiment',
          start_date: record.start_date || record.StartDate || record.start || new Date().toISOString().split('T')[0],
          end_date: record.end_date || record.EndDate || record.end || new Date().toISOString().split('T')[0],
          winning_variant: record.winning_variant || record.Winner || record.winner || 'A',
          uplift_relative: parseFloat(record.uplift || record.Uplift || record.improvement || '0'),
          statistical_significance: (record.significance || record.Significance || 'true').toLowerCase() === 'true',
          key_insights: record.insights || record.Insights || record.learnings || 'Imported from CSV'
        }));

        const { error } = await supabase
          .from('experiment_results')
          .insert(experimentRecords);

        if (error) throw error;

        toast({
          title: "Experiments imported successfully",
          description: `Imported ${experimentRecords.length} experiment records`
        });
      }

      setShowImportDialog(false);
      loadHistoricData();
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const downloadTemplate = (type: 'campaign' | 'experiment') => {
    let csvContent = '';
    
    if (type === 'campaign') {
      csvContent = `campaign_name,campaign_date,traffic_source,sessions,users,conversions,conversion_rate,bounce_rate,avg_time_on_page,cost_per_conversion
Sample Campaign,2024-01-15,Google Ads,1500,1200,75,0.05,0.35,120,25.50
Example Campaign 2,2024-01-20,Facebook Ads,2000,1600,80,0.04,0.42,95,30.25`;
    } else {
      csvContent = `experiment_name,start_date,end_date,winning_variant,uplift,significance,insights
Button Color Test,2024-01-01,2024-01-15,B,15.2,true,Green button performed better than red
Headline A/B Test,2024-01-16,2024-01-30,A,8.7,true,Benefit-focused headline outperformed feature-focused`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_template.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.campaign_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         campaign.traffic_source.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (filterPeriod === 'all') return true;
    
    const campaignDate = new Date(campaign.campaign_date);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - campaignDate.getTime()) / (1000 * 60 * 60 * 24));
    
    switch (filterPeriod) {
      case '30d': return daysDiff <= 30;
      case '90d': return daysDiff <= 90;
      case '1y': return daysDiff <= 365;
      default: return true;
    }
  });

  const calculateInsights = () => {
    if (campaigns.length === 0) return null;
    
    const totalCampaigns = campaigns.length;
    const avgConversionRate = campaigns.reduce((sum, c) => sum + (c.primary_conversion_rate || 0), 0) / totalCampaigns;
    const avgBounceRate = campaigns.reduce((sum, c) => sum + (c.bounce_rate || 0), 0) / totalCampaigns;
    const topPerformer = campaigns.reduce((best, current) => 
      (current.primary_conversion_rate || 0) > (best.primary_conversion_rate || 0) ? current : best
    );
    
    return {
      totalCampaigns,
      avgConversionRate: (avgConversionRate * 100).toFixed(1),
      avgBounceRate: (avgBounceRate * 100).toFixed(1),
      topPerformer
    };
  };

  const insights = calculateInsights();

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
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6" />
            Historic Data Manager
          </h2>
          <p className="text-muted-foreground">
            Import and manage your campaign performance data and A/B test results
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Import Data
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Import Historic Data</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Data Type</Label>
                  <Select value={importType} onValueChange={(value: 'campaign' | 'experiment') => setImportType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="campaign">Campaign Data</SelectItem>
                      <SelectItem value="experiment">A/B Test Results</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Upload CSV File</Label>
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImportCSV(file, importType);
                      }
                    }}
                  />
                </div>
                
                <Button 
                  variant="outline" 
                  onClick={() => downloadTemplate(importType)}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Insights Cards */}
      {insights && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Campaigns</p>
                  <p className="text-2xl font-bold">{insights.totalCampaigns}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Avg Conversion Rate</p>
                  <p className="text-2xl font-bold">{insights.avgConversionRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Avg Bounce Rate</p>
                  <p className="text-2xl font-bold">{insights.avgBounceRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Top Performer</p>
                  <p className="text-sm font-semibold truncate">{insights.topPerformer.campaign_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(insights.topPerformer.primary_conversion_rate * 100).toFixed(1)}% CVR
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="campaigns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="campaigns">Campaign Data</TabsTrigger>
          <TabsTrigger value="experiments">A/B Test Results</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterPeriod} onValueChange={setFilterPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Campaigns Table */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance Data</CardTitle>
              <CardDescription>
                Historic campaign data used for AI-driven optimizations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Sessions</TableHead>
                    <TableHead>Conversions</TableHead>
                    <TableHead>CVR</TableHead>
                    <TableHead>Bounce Rate</TableHead>
                    <TableHead>Cost/Conv</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampaigns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No campaign data found. Import your historic data to enable AI-driven optimizations.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCampaigns.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell className="font-medium">{campaign.campaign_name}</TableCell>
                        <TableCell>{new Date(campaign.campaign_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{campaign.traffic_source}</Badge>
                        </TableCell>
                        <TableCell>{campaign.sessions.toLocaleString()}</TableCell>
                        <TableCell>{campaign.primary_conversions}</TableCell>
                        <TableCell>{(campaign.primary_conversion_rate * 100).toFixed(1)}%</TableCell>
                        <TableCell>{(campaign.bounce_rate * 100).toFixed(1)}%</TableCell>
                        <TableCell>${campaign.cost_per_conversion?.toFixed(2) || '0.00'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="experiments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>A/B Test Results</CardTitle>
              <CardDescription>
                Experiment learnings used to inform page generation decisions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Experiment</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Winner</TableHead>
                    <TableHead>Uplift</TableHead>
                    <TableHead>Significant</TableHead>
                    <TableHead>Key Insights</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {experiments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No experiment data found. Import your A/B test results to improve AI decisions.
                      </TableCell>
                    </TableRow>
                  ) : (
                    experiments.map((experiment) => (
                      <TableRow key={experiment.id}>
                        <TableCell className="font-medium">{experiment.experiment_name}</TableCell>
                        <TableCell>
                          {new Date(experiment.start_date).toLocaleDateString()} - {new Date(experiment.end_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={experiment.winning_variant === 'A' ? 'default' : 'secondary'}>
                            Variant {experiment.winning_variant}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-green-600 font-semibold">
                          +{experiment.uplift_relative.toFixed(1)}%
                        </TableCell>
                        <TableCell>
                          <Badge variant={experiment.statistical_significance ? 'default' : 'destructive'}>
                            {experiment.statistical_significance ? 'Yes' : 'No'}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate" title={experiment.key_insights}>
                          {experiment.key_insights}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HistoricDataManager;