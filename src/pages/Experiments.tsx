import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { 
  TestTube,
  Play,
  Pause,
  Eye,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  Target,
  BarChart3,
  Plus,
  Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Experiment {
  id: string;
  name: string;
  hypothesis: string;
  status: string;
  page_id: string;
  control_config: any;
  variant_config: any;
  traffic_allocation: number;
  start_date: string;
  end_date: string;
  results: any;
  statistical_significance: boolean;
  winner: string;
  created_at: string;
  page_title?: string;
}

interface ExperimentResult {
  id: string;
  experiment_name: string;
  hypothesis: string;
  winning_variant: string;
  uplift_relative: number;
  statistical_significance: boolean;
  sample_size_control: number;
  sample_size_variant: number;
  primary_metric: string;
  created_at: string;
}

const Experiments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [results, setResults] = useState<ExperimentResult[]>([]);

  useEffect(() => {
    loadExperiments();
    loadResults();
  }, []);

  const loadExperiments = async () => {
    try {
      const { data, error } = await supabase
        .from('experiments')
        .select(`
          *,
          generated_pages (title)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const experimentsWithPageTitle = data?.map(exp => ({
        ...exp,
        page_title: exp.generated_pages?.title || 'Unknown Page'
      })) || [];

      setExperiments(experimentsWithPageTitle);
    } catch (error: any) {
      console.error('Error loading experiments:', error);
      toast({
        title: "Error",
        description: "Failed to load experiments",
        variant: "destructive"
      });
    }
  };

  const loadResults = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('experiment_results')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResults(data || []);
    } catch (error: any) {
      console.error('Error loading results:', error);
      toast({
        title: "Error",
        description: "Failed to load experiment results",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const runningExperiments = experiments.filter(exp => exp.status === 'running');
  const completedExperiments = experiments.filter(exp => exp.status === 'completed');
  const totalTests = experiments.length;
  const avgUplift = results.length > 0 
    ? results.reduce((sum, r) => sum + (r.uplift_relative || 0), 0) / results.length 
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
          <h1 className="text-3xl font-bold">A/B Tests & Experiments</h1>
          <p className="text-muted-foreground">
            Optimize your landing pages with data-driven testing
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Experiment
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Tests</p>
                <p className="text-2xl font-bold">{totalTests}</p>
                <p className="text-xs text-muted-foreground mt-1">All time</p>
              </div>
              <TestTube className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Running</p>
                <p className="text-2xl font-bold">{runningExperiments.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Active now</p>
              </div>
              <Play className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{completedExperiments.length}</p>
                <p className="text-xs text-muted-foreground mt-1">With results</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. Uplift</p>
                <p className="text-2xl font-bold">{avgUplift.toFixed(1)}%</p>
                <div className="flex items-center mt-1">
                  {avgUplift > 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                  )}
                  <p className="text-xs text-muted-foreground">Positive impact</p>
                </div>
              </div>
              <Target className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active Tests</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Running Experiments</CardTitle>
              <CardDescription>
                Currently active A/B tests across your landing pages
              </CardDescription>
            </CardHeader>
            <CardContent>
              {runningExperiments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Experiment</TableHead>
                      <TableHead>Page</TableHead>
                      <TableHead>Traffic Split</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runningExperiments.map((experiment) => (
                      <TableRow key={experiment.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{experiment.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {experiment.hypothesis?.substring(0, 50)}...
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{experiment.page_title}</TableCell>
                        <TableCell>
                          {Math.round((1 - experiment.traffic_allocation) * 100)}% / {Math.round(experiment.traffic_allocation * 100)}%
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {experiment.start_date ? 
                              Math.ceil((new Date().getTime() - new Date(experiment.start_date).getTime()) / (1000 * 3600 * 24)) 
                              : 0} days
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(experiment.status)}>
                            {experiment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Pause className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <TestTube className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No active experiments</h3>
                  <p className="text-muted-foreground mb-4">
                    Start your first A/B test to optimize conversion rates
                  </p>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Experiment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Experiment Results</CardTitle>
              <CardDescription>
                Historical results and insights from completed tests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {results.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Experiment</TableHead>
                      <TableHead>Winner</TableHead>
                      <TableHead>Uplift</TableHead>
                      <TableHead>Sample Size</TableHead>
                      <TableHead>Significance</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{result.experiment_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {result.primary_metric}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {result.winning_variant}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {result.uplift_relative > 0 ? (
                              <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                            )}
                            <span className={result.uplift_relative > 0 ? 'text-green-600' : 'text-red-600'}>
                              {result.uplift_relative > 0 ? '+' : ''}{result.uplift_relative?.toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            {((result.sample_size_control || 0) + (result.sample_size_variant || 0)).toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={result.statistical_significance ? "default" : "secondary"}>
                            {result.statistical_significance ? "Significant" : "Not Significant"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(result.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No results yet</h3>
                  <p className="text-muted-foreground">
                    Complete your first experiment to see results here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="archived" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Archived Experiments</CardTitle>
              <CardDescription>
                Completed and archived A/B tests for reference
              </CardDescription>
            </CardHeader>
            <CardContent>
              {completedExperiments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Experiment</TableHead>
                      <TableHead>Page</TableHead>
                      <TableHead>Winner</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedExperiments.map((experiment) => (
                      <TableRow key={experiment.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{experiment.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {experiment.hypothesis?.substring(0, 50)}...
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{experiment.page_title}</TableCell>
                        <TableCell>
                          {experiment.winner ? (
                            <Badge variant="outline">{experiment.winner}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {experiment.start_date && experiment.end_date ? 
                            Math.ceil((new Date(experiment.end_date).getTime() - new Date(experiment.start_date).getTime()) / (1000 * 3600 * 24)) 
                            : 0} days
                        </TableCell>
                        <TableCell>
                          {experiment.end_date ? new Date(experiment.end_date).toLocaleDateString() : '-'}
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
                  <TestTube className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No archived experiments</h3>
                  <p className="text-muted-foreground">
                    Completed experiments will appear here
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

export default Experiments;