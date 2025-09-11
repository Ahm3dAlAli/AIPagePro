import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import DataImportManager from '@/components/DataImportManager';
import DataDrivenInsights from '@/components/DataDrivenInsights';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { 
  Rocket,
  Play,
  Pause,
  Eye,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  Target,
  DollarSign,
  Plus,
  Search,
  Filter,
  BarChart3,
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Campaign {
  id: string;
  name: string;
  objective: string;
  target_audience: string;
  status: string;
  primary_kpi: string;
  config: any;
  created_at: string;
  updated_at: string;
}

interface HistoricCampaign {
  id: string;
  campaign_name: string;
  campaign_date: string;
  sessions: number;
  primary_conversions?: number;
  conversions?: number;
  primary_conversion_rate: number;
  total_spend: number;
  cost_per_conversion: number;
  bounce_rate: number;
  utm_source: string;
  utm_medium: string;
  created_at: string;
  [key: string]: any; // Allow additional properties from database
}

const Campaigns = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [historicCampaigns, setHistoricCampaigns] = useState<HistoricCampaign[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCampaigns();
    loadHistoricCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error: any) {
      console.error('Error loading campaigns:', error);
      toast({
        title: "Error",
        description: "Failed to load campaigns",
        variant: "destructive"
      });
    }
  };

  const loadHistoricCampaigns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('historic_campaigns')
        .select('*')
        .order('campaign_date', { ascending: false })
        .limit(50);

      if (error) throw error;
      setHistoricCampaigns(data || []);
    } catch (error: any) {
      console.error('Error loading historic campaigns:', error);
      toast({
        title: "Error",
        description: "Failed to load historic campaigns",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    campaign.objective.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredHistoricCampaigns = historicCampaigns.filter(campaign =>
    campaign.campaign_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate summary stats
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
  const totalSpend = historicCampaigns.reduce((sum, c) => sum + (c.total_spend || 0), 0);
  const totalConversions = historicCampaigns.reduce((sum, c) => sum + (c.primary_conversions || c.conversions || 0), 0);
  const avgConversionRate = historicCampaigns.length > 0 
    ? historicCampaigns.reduce((sum, c) => sum + (c.primary_conversion_rate || 0), 0) / historicCampaigns.length 
    : 0;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Campaign Management</h1>
          <p className="text-muted-foreground">
            Create, manage, and optimize your marketing campaigns
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Campaigns</p>
                <p className="text-2xl font-bold">{activeCampaigns}</p>
                <p className="text-xs text-muted-foreground mt-1">Currently running</p>
              </div>
              <Rocket className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Spend</p>
                <p className="text-2xl font-bold">${totalSpend.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">All campaigns</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Conversions</p>
                <p className="text-2xl font-bold">{totalConversions.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">Generated</p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. Conv. Rate</p>
                <p className="text-2xl font-bold">{(avgConversionRate * 100).toFixed(1)}%</p>
                <div className="flex items-center mt-1">
                  {avgConversionRate > 0.02 ? (
                    <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                  )}
                  <p className="text-xs text-muted-foreground">Performance</p>
                </div>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active Campaigns</TabsTrigger>
          <TabsTrigger value="performance">Performance Data</TabsTrigger>
          <TabsTrigger value="import">Data Import</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Campaigns</CardTitle>
              <CardDescription>
                Active marketing campaigns and their configurations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredCampaigns.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Objective</TableHead>
                      <TableHead>Target Audience</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCampaigns.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{campaign.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {campaign.primary_kpi || 'No KPI set'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <p className="text-sm">{campaign.objective}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm max-w-xs truncate">
                            {campaign.target_audience || 'Not specified'}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(campaign.status)}>
                            {campaign.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(campaign.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              {campaign.status === 'active' ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Rocket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No campaigns found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery ? 'Try adjusting your search terms' : 'Create your first campaign to get started'}
                  </p>
                  {!searchQuery && (
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Campaign
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance</CardTitle>
              <CardDescription>
                Historical performance data and metrics from past campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredHistoricCampaigns.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Sessions</TableHead>
                      <TableHead>Conversions</TableHead>
                      <TableHead>Conv. Rate</TableHead>
                      <TableHead>Spend</TableHead>
                      <TableHead>CPC</TableHead>
                      <TableHead>Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistoricCampaigns.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell>
                          <p className="font-medium">{campaign.campaign_name}</p>
                        </TableCell>
                        <TableCell>
                          {new Date(campaign.campaign_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-1 text-muted-foreground" />
                            {campaign.sessions?.toLocaleString() || 0}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Target className="h-4 w-4 mr-1 text-muted-foreground" />
                            {(campaign.primary_conversions || campaign.conversions || 0).toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {(campaign.primary_conversion_rate || 0) > 0.02 ? (
                              <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                            )}
                            <span className={(campaign.primary_conversion_rate || 0) > 0.02 ? 'text-green-600' : 'text-red-600'}>
                              {((campaign.primary_conversion_rate || 0) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-1 text-muted-foreground" />
                            ${(campaign.total_spend || 0).toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          ${(campaign.cost_per_conversion || 0).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <Badge variant="outline" className="text-xs">
                              {campaign.utm_source || 'Direct'}
                            </Badge>
                            {campaign.utm_medium && (
                              <span className="text-xs text-muted-foreground mt-1">
                                {campaign.utm_medium}
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No performance data</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery ? 'No campaigns match your search' : 'Import historic campaign data to see performance metrics'}
                  </p>
                  {!searchQuery && (
                    <Button variant="outline">
                      <Activity className="h-4 w-4 mr-2" />
                      Import Data
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <DataImportManager />
          <DataDrivenInsights />
        </TabsContent>

        <TabsContent value="archived" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Archived Campaigns</CardTitle>
              <CardDescription>
                Completed and archived campaigns for reference
              </CardDescription>
            </CardHeader>
            <CardContent>
              {campaigns.filter(c => c.status === 'completed').length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Objective</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Final Status</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.filter(c => c.status === 'completed').map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{campaign.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {campaign.primary_kpi || 'No KPI set'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm max-w-xs truncate">{campaign.objective}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                            {Math.ceil((new Date(campaign.updated_at).getTime() - new Date(campaign.created_at).getTime()) / (1000 * 3600 * 24))} days
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(campaign.status)}>
                            {campaign.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(campaign.updated_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            View Report
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Rocket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No archived campaigns</h3>
                  <p className="text-muted-foreground">
                    Completed campaigns will appear here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Campaigns;