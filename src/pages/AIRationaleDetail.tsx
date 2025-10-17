import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

interface RationaleReport {
  id: string;
  page_id: string;
  report_type: string;
  rationale_data: any;
  pdf_url: string | null;
  generated_at: string;
}

const AIRationaleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [report, setReport] = useState<RationaleReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, [id]);

  const fetchReport = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("ai_rationale_reports")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      setReport(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      navigate("/ai-rationale");
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!report) return;
    try {
      const { data, error } = await supabase.functions.invoke("generate-pdf-report", {
        body: { reportId: report.id },
      });

      if (error) throw error;

      const blob = new Blob([data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ai-rationale-${report.id}.pdf`;
      a.click();
    } catch (error: any) {
      toast({
        title: "Download Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Loading report...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6 print:p-0">
      {/* Header - Hidden in print */}
      <div className="flex items-center justify-between print:hidden">
        <Button variant="ghost" onClick={() => navigate("/ai-rationale")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Reports
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button onClick={downloadPDF}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Report Content */}
      <Card className="print:shadow-none print:border-0">
        <CardHeader className="print:pb-4">
          <CardTitle className="text-3xl">AI Design Rationale</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Generated {new Date(report.rationale_data?.generatedAt || report.generated_at).toLocaleString()}
          </p>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* PRD Content - Structured Display */}
          {report.rationale_data?.content && typeof report.rationale_data.content === 'string' ? (
            <div className="space-y-6">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-3xl font-bold mt-8 mb-4 pb-3 border-b border-border text-foreground">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-2xl font-semibold mt-8 mb-4 text-foreground">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-xl font-semibold mt-6 mb-3 text-foreground">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="mb-4 text-foreground leading-relaxed">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal pl-6 mb-4 space-y-2 text-foreground">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-foreground leading-relaxed">
                      {children}
                    </li>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-foreground">
                      {children}
                    </strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic text-foreground">
                      {children}
                    </em>
                  ),
                  code: ({ children }) => (
                    <code className="bg-muted px-2 py-1 rounded text-sm font-mono text-foreground">
                      {children}
                    </code>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-primary pl-4 py-2 my-4 bg-muted/30 rounded-r text-foreground">
                      {children}
                    </blockquote>
                  ),
                  hr: () => (
                    <hr className="my-8 border-border" />
                  ),
                }}
              >
                {report.rationale_data.content}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No content available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AIRationaleDetail;
