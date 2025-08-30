import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Plus, 
  FileText, 
  TrendingUp, 
  Users, 
  Globe,
  Zap,
  Target,
  Award,
  ArrowRight,
  Activity,
  Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DashboardStats {
  totalPages: number;
  thisWeekPages: number;
  totalConversions: number;
  totalSessions: number;
  avgConversionRate: number;
  activeExperiments: number;
}

interface RecentPage {
  id: string;
  title: string;
  conversions: number;
  sessions: number;
  conversion_rate: number;
  status: string;
  created_at: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalPages: 0,
    thisWeekPages: 0,
    totalConversions: 0,
    totalSessions: 0,
    avgConversionRate: 0,
    activeExperiments: 0
  });
  const [recentPages, setRecentPages] = useState<RecentPage[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get date ranges
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Fetch pages count
      const { data: pagesData, error: pagesError } = await supabase
        .from('generated_pages')
        .select('id, created_at')
        .order('created_at', { ascending: false });

      if (pagesError) throw pagesError;

      const totalPages = pagesData?.length || 0;
      const thisWeekPages = pagesData?.filter(page => 
        new Date(page.created_at) >= oneWeekAgo
      ).length || 0;

      // Fetch recent pages with analytics
      const { data: recentPagesData, error: recentError } = await supabase
        .from('generated_pages')
        .select(`
          id,
          title,
          status,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentError) throw recentError;

      // Fetch analytics data
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('analytics_data')
        .select('*')
        .gte('date', oneMonthAgo.toISOString().split('T')[0]);

      if (analyticsError) throw analyticsError;

      // Calculate metrics
      const totalConversions = analyticsData?.reduce((sum, row) => sum + (row.conversions || 0), 0) || 0;
      const totalSessions = analyticsData?.reduce((sum, row) => sum + (row.sessions || 0), 0) || 0;
      const avgConversionRate = totalSessions > 0 ? (totalConversions / totalSessions) : 0;

      // Fetch experiments count
      const { data: experimentsData, error: experimentsError } = await supabase
        .from('experiments')
        .select('id, status')
        .in('status', ['running', 'active']);

      if (experimentsError) throw experimentsError;

      const activeExperiments = experimentsData?.length || 0;

      // Process recent pages with their analytics
      const processedRecentPages = await Promise.all(
        (recentPagesData || []).map(async (page) => {
          const { data: pageAnalytics } = await supabase
            .from('analytics_data')
            .select('conversions, sessions')
            .eq('page_id', page.id)
            .gte('date', oneMonthAgo.toISOString().split('T')[0]);

          const pageConversions = pageAnalytics?.reduce((sum, row) => sum + (row.conversions || 0), 0) || 0;
          const pageSessions = pageAnalytics?.reduce((sum, row) => sum + (row.sessions || 0), 0) || 0;
          const pageConversionRate = pageSessions > 0 ? (pageConversions / pageSessions) : 0;

          return {
            id: page.id,
            title: page.title,
            conversions: pageConversions,
            sessions: pageSessions,
            conversion_rate: pageConversionRate,
            status: page.status,
            created_at: page.created_at
          };
        })
      );

      setStats({
        totalPages,
        thisWeekPages,
        totalConversions,
        totalSessions,
        avgConversionRate,
        activeExperiments
      });

      setRecentPages(processedRecentPages);
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    {
      title: "Pages Generated",
      value: stats.totalPages.toString(),
      change: `+${stats.thisWeekPages} this week`,
      icon: Globe,
      color: "text-blue-600"
    },
    {
      title: "Total Conversions",
      value: stats.totalConversions.toLocaleString(),
      change: `${stats.totalSessions.toLocaleString()} total sessions`,
      icon: Target,
      color: "text-green-600"
    },
    {
      title: "Avg. Conversion Rate",
      value: `${(stats.avgConversionRate * 100).toFixed(1)}%`,
      change: `Across all pages`,
      icon: TrendingUp,
      color: "text-purple-600"
    },
    {
      title: "Active Experiments",
      value: stats.activeExperiments.toString(),
      change: "Currently running",
      icon: BarChart3,
      color: "text-orange-600"
    }
  ];

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {user?.user_metadata?.full_name || user?.email}!</h1>
        <p className="text-muted-foreground mt-2">
          Here's what's happening with your AI-generated landing pages today.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors">
          <CardContent className="p-6 text-center">
            <div className="mb-4">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Plus className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h3 className="font-semibold mb-2">Create New Page</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Generate a high-converting landing page with AI
            </p>
            <Button asChild className="w-full">
              <Link to="/dashboard/create">
                Start Creating
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6 text-center">
            <div className="mb-4">
              <div className="mx-auto w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <h3 className="font-semibold mb-2">Browse Templates</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Explore pre-built templates and schemas
            </p>
            <Button variant="outline" asChild className="w-full">
              <Link to="/dashboard/templates">Browse Library</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6 text-center">
            <div className="mb-4">
              <div className="mx-auto w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <h3 className="font-semibold mb-2">View Analytics</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Track performance and conversion metrics
            </p>
            <Button variant="outline" asChild className="w-full">
              <Link to="/dashboard/analytics">View Reports</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
                </div>
                <div className={`p-2 rounded-lg bg-muted ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Pages */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Pages</CardTitle>
            <CardDescription>Your latest AI-generated landing pages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPages.length > 0 ? (
                recentPages.map((page) => (
                  <div key={page.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <h4 className="font-medium">{page.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {page.conversions} conversions • {(page.conversion_rate * 100).toFixed(1)}% rate
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          {page.sessions} sessions
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(page.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={page.status === 'published' ? 'default' : 'secondary'}
                        className="capitalize"
                      >
                        {page.status}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Globe className="h-8 w-8 mx-auto mb-2" />
                  <p>No pages created yet</p>
                  <Button asChild className="mt-2" size="sm">
                    <Link to="/dashboard/create">Create Your First Page</Link>
                  </Button>
                </div>
              )}
            </div>
            <div className="mt-4">
              <Button variant="outline" asChild className="w-full">
                <Link to="/dashboard/pages">View All Pages</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Performance Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Overview</CardTitle>
            <CardDescription>Your optimization progress this month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Conversion Rate Goal (5%)</span>
                <span>{Math.min(100, (stats.avgConversionRate * 100 * 20)).toFixed(0)}%</span>
              </div>
              <Progress value={Math.min(100, (stats.avgConversionRate * 100 * 20))} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Active Experiments</span>
                <span>{stats.activeExperiments} running</span>
              </div>
              <Progress value={Math.min(100, stats.activeExperiments * 20)} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                Keep 3-5 experiments running for optimal testing
              </p>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Pages Created This Month</span>
                <span>{Math.min(100, stats.totalPages * 5).toFixed(0)}%</span>
              </div>
              <Progress value={Math.min(100, stats.totalPages * 5)} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                Goal: 20 pages per month
              </p>
            </div>
            
            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 text-sm">
                <Award className="h-4 w-4 text-primary" />
                <span className="font-medium">
                  {stats.totalPages >= 10 
                    ? `🎉 Achievement: Generated ${stats.totalPages} pages!` 
                    : `Keep going! ${10 - stats.totalPages} more pages to unlock achievement`
                  }
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                <Activity className="h-4 w-4" />
                <span>
                  {stats.totalConversions > 0 
                    ? `Total impact: ${stats.totalConversions} conversions generated` 
                    : "Start generating conversions with your first page"
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;