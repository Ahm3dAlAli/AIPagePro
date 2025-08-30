import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();

  const stats = [
    {
      title: "Pages Generated",
      value: "12",
      change: "+3 this week",
      icon: Globe,
      color: "text-blue-600"
    },
    {
      title: "Total Conversions",
      value: "1,284",
      change: "+15.2% vs last month",
      icon: Target,
      color: "text-green-600"
    },
    {
      title: "Avg. Conversion Rate",
      value: "3.8%",
      change: "+0.4% improvement",
      icon: TrendingUp,
      color: "text-purple-600"
    },
    {
      title: "A/B Tests Running",
      value: "5",
      change: "2 concluded this week",
      icon: BarChart3,
      color: "text-orange-600"
    }
  ];

  const recentPages = [
    {
      name: "SaaS Landing Page",
      conversions: 45,
      rate: 4.2,
      status: "Active"
    },
    {
      name: "E-commerce Product Page",
      conversions: 32,
      rate: 3.8,
      status: "Testing"
    },
    {
      name: "Lead Gen Form",
      conversions: 28,
      rate: 5.1,
      status: "Active"
    }
  ];

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
        {stats.map((stat, index) => (
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
              {recentPages.map((page, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <h4 className="font-medium">{page.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {page.conversions} conversions • {page.rate}% rate
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      page.status === 'Active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {page.status}
                    </span>
                  </div>
                </div>
              ))}
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
                <span>Conversion Rate Goal</span>
                <span>76%</span>
              </div>
              <Progress value={76} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>A/B Test Completion</span>
                <span>40%</span>
              </div>
              <Progress value={40} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Template Usage</span>
                <span>85%</span>
              </div>
              <Progress value={85} className="h-2" />
            </div>
            
            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Award className="h-4 w-4" />
                <span>Achievement: Generated 10+ pages this month!</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;