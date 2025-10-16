import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Eye, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface RationaleReport {
  id: string;
  page_id: string;
  report_type: string;
  rationale_data: any;
  pdf_url: string | null;
  generated_at: string;
}

const AIRationale = () => {
  const { toast } = useToast();
  const [reports, setReports] = useState<RationaleReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("ai_rationale_reports")
        .select("*")
        .eq("user_id", user.id)
        .order("generated_at", { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateRationale = async (pageId: string) => {
    setGenerating(pageId);
    try {
      const { data, error } = await supabase.functions.invoke("generate-ai-rationale", {
        body: { pageId },
      });

      if (error) throw error;

      toast({
        title: "Rationale Generated",
        description: "AI rationale report has been created successfully",
      });

      fetchReports();
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(null);
    }
  };

  const downloadPDF = async (reportId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("generate-pdf-report", {
        body: { reportId },
      });

      if (error) throw error;

      // Download the PDF
      const blob = new Blob([data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ai-rationale-${reportId}.pdf`;
      a.click();
    } catch (error: any) {
      toast({
        title: "Download Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Rationale Reports</h1>
        <p className="text-muted-foreground mt-2">
          Explainability for every design decision - AI-generated rationale mapped to data insights
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <Card className="col-span-full">
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Loading reports...</p>
            </CardContent>
          </Card>
        ) : reports.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-12 text-center">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No rationale reports yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Generate a landing page to create your first AI rationale report
              </p>
            </CardContent>
          </Card>
        ) : (
          reports.map((report) => (
            <Card key={report.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {report.report_type.replace(/_/g, " ").toUpperCase()}
                </CardTitle>
                <CardDescription>
                  Generated: {new Date(report.generated_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Generated</p>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(report.rationale_data?.generatedAt || report.generated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">AI Model</p>
                    <p className="text-sm font-medium text-foreground">
                      {report.rationale_data?.model || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Data Sources */}
                {report.rationale_data?.dataSourcesUsed && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-foreground">Data Sources</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Campaigns:</span>
                        <span className="font-medium text-foreground">
                          {report.rationale_data.dataSourcesUsed.campaignCount || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Experiments:</span>
                        <span className="font-medium text-foreground">
                          {report.rationale_data.dataSourcesUsed.experimentCount || 0}
                        </span>
                      </div>
                      <div className="col-span-2 flex items-center justify-between">
                        <span className="text-muted-foreground">Avg Conv. Rate:</span>
                        <span className="font-medium text-foreground">
                          {(report.rationale_data.dataSourcesUsed.avgConversionRate * 100).toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Content Preview */}
                {report.rationale_data?.content && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-foreground">PRD Preview</p>
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      {typeof report.rationale_data.content === 'string' 
                        ? report.rationale_data.content.substring(0, 200) + '...'
                        : 'Full PRD available in detailed view'}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => window.location.href = `/ai-rationale/${report.id}`}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Full Report
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadPDF(report.id)}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default AIRationale;
