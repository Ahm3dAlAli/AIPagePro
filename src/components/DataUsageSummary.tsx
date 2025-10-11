import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, TrendingUp, Target, Lightbulb, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface DataUsageSummaryProps {
  pageId: string;
}

interface DataUsageReport {
  campaign_fields_used: {
    field_name: string;
    field_value: any;
    usage_context: string;
  }[];
  experiment_results_used: {
    experiment_name: string;
    winning_variant: string;
    applied_to: string;
  }[];
  mapping_to_elements: {
    data_source: string;
    page_element: string;
    reasoning: string;
  }[];
  assumptions_made: {
    assumption: string;
    rationale: string;
    confidence_level: string;
  }[];
  performance_metrics_analyzed: {
    metric_name: string;
    value: number;
    influence_on_design: string;
  }[];
}

const DataUsageSummary: React.FC<DataUsageSummaryProps> = ({ pageId }) => {
  const { toast } = useToast();
  const [dataUsage, setDataUsage] = useState<DataUsageReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchDataUsage();
  }, [pageId]);

  const fetchDataUsage = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if data usage report exists in ai_rationale_reports with type 'data_usage'
      const { data, error } = await supabase
        .from("ai_rationale_reports")
        .select("*")
        .eq("page_id", pageId)
        .eq("report_type", "data_usage")
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setDataUsage(data.rationale_data as unknown as DataUsageReport);
      }
    } catch (error: any) {
      console.error("Error fetching data usage:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateDataUsage = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-data-usage", {
        body: { pageId },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Data Usage Generated",
          description: "Campaign data mapping has been analyzed successfully",
        });
        await fetchDataUsage();
      }
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading data usage summary...</p>
        </CardContent>
      </Card>
    );
  }

  if (!dataUsage) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">No data usage summary yet</p>
          <p className="text-sm text-muted-foreground mb-6">
            Generate a data usage summary to see which campaign fields and experiment results influenced this page
          </p>
          <Button onClick={generateDataUsage} disabled={generating}>
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Generate Data Usage
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Data Usage Summary</h2>
          <p className="text-muted-foreground mt-1">
            Campaign fields, experiment results, and assumptions used in page generation
          </p>
        </div>
        <Button onClick={generateDataUsage} disabled={generating} variant="outline">
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Regenerating...
            </>
          ) : (
            "Regenerate"
          )}
        </Button>
      </div>

      {/* Campaign Fields Used */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            Campaign Fields Used
          </CardTitle>
          <CardDescription>
            Historic campaign data fields that influenced page design
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dataUsage.campaign_fields_used?.map((field, index) => (
              <div key={index} className="border-l-2 border-blue-600 pl-4 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline">{field.field_name}</Badge>
                  <span className="text-sm font-medium">{field.field_value}</span>
                </div>
                <p className="text-sm text-muted-foreground">{field.usage_context}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Experiment Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Experiment Results Applied
          </CardTitle>
          <CardDescription>
            A/B test insights integrated into page design
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dataUsage.experiment_results_used?.map((experiment, index) => (
              <div key={index} className="border-l-2 border-green-600 pl-4 py-2">
                <div className="mb-1">
                  <p className="font-medium">{experiment.experiment_name}</p>
                  <Badge variant="secondary" className="mt-1">
                    Winner: {experiment.winning_variant}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Applied to: {experiment.applied_to}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Element Mapping */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-600" />
            Data-to-Element Mapping
          </CardTitle>
          <CardDescription>
            How historic data mapped to specific page elements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dataUsage.mapping_to_elements?.map((mapping, index) => (
              <div key={index} className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <Badge>{mapping.data_source}</Badge>
                  <Badge variant="outline">{mapping.page_element}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{mapping.reasoning}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-600" />
            Performance Metrics Analyzed
          </CardTitle>
          <CardDescription>
            Key metrics that influenced design decisions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dataUsage.performance_metrics_analyzed?.map((metric, index) => (
              <div key={index} className="flex items-start gap-4 p-3 bg-muted/30 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{metric.metric_name}</p>
                    <Badge variant="secondary">{metric.value}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{metric.influence_on_design}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Assumptions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-600" />
            Assumptions Made
          </CardTitle>
          <CardDescription>
            AI assumptions and their confidence levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dataUsage.assumptions_made?.map((assumption, index) => (
              <div key={index} className="border-l-2 border-yellow-600 pl-4 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium">{assumption.assumption}</p>
                  <Badge
                    variant={
                      assumption.confidence_level === "high"
                        ? "default"
                        : assumption.confidence_level === "medium"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {assumption.confidence_level} confidence
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{assumption.rationale}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataUsageSummary;
