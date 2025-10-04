import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Download, ExternalLink, Rocket } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface GeneratedPage {
  id: string;
  title: string;
  content: any;
  created_at: string;
}

export default function GeneratedPageView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState<GeneratedPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);

  useEffect(() => {
    fetchPage();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('page-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'generated_pages',
          filter: `id=eq.${id}`
        },
        (payload) => {
          setPage(payload.new as GeneratedPage);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const fetchPage = async () => {
    try {
      const { data, error } = await supabase
        .from("generated_pages")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setPage(data);
    } catch (error) {
      console.error("Error fetching page:", error);
      toast.error("Failed to load page");
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async () => {
    if (!page) return;
    
    setDeploying(true);
    try {
      const { data, error } = await supabase.functions.invoke("deploy-to-vercel", {
        body: { pageId: page.id },
      });

      if (error) throw error;

      toast.success("Deployment started successfully!");
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Deployment error:", error);
      toast.error("Failed to deploy page");
    } finally {
      setDeploying(false);
    }
  };

  const downloadComponent = (fileName: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Page not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show generating state while v0 is working
  const isGenerating = page.content.status === "generating";
  
  if (isGenerating) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/my-pages")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{page.title}</h1>
              <p className="text-sm text-muted-foreground">
                Generated on {new Date(page.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="h-3 w-3 rounded-full bg-yellow-500 animate-pulse" />
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold">Generating Your Page</h3>
                <p className="text-muted-foreground max-w-md">
                  v0 is creating your landing page with AI. This usually takes 1-2 minutes.
                  The page will automatically update when complete.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const prdContent = typeof page.content.prdDocument === "string"
    ? page.content.prdDocument
    : page.content.prdDocument?.content || JSON.stringify(page.content.prdDocument, null, 2);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/my-pages")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{page.title}</h1>
            <p className="text-sm text-muted-foreground">
              Generated on {new Date(page.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {page.content.demoUrl && (
            <Button variant="outline" asChild>
              <a href={page.content.demoUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open in v0
              </a>
            </Button>
          )}
          <Button onClick={handleDeploy} disabled={deploying}>
            <Rocket className="mr-2 h-4 w-4" />
            {deploying ? "Deploying..." : "Deploy to Vercel"}
          </Button>
        </div>
      </div>

      {/* Status Badge */}
      {page.content.status && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${
                page.content.status === "generating" ? "bg-yellow-500 animate-pulse" :
                page.content.status === "error" ? "bg-red-500" : "bg-green-500"
              }`} />
              <span className="text-sm font-medium capitalize">{page.content.status}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="preview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="rationale">AI Rationale</TabsTrigger>
          <TabsTrigger value="sitecore">Sitecore Exports</TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Live Preview</CardTitle>
              <CardDescription>
                Interactive preview from v0.dev
              </CardDescription>
            </CardHeader>
            <CardContent>
              {page.content.demoUrl ? (
                <iframe
                  src={page.content.demoUrl}
                  className="w-full h-[800px] border rounded-lg"
                  title="Page Preview"
                />
              ) : (
                <p className="text-center text-muted-foreground py-12">
                  Preview not available
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="components" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generated Components</CardTitle>
              <CardDescription>
                React components generated by v0
              </CardDescription>
            </CardHeader>
            <CardContent>
              {page.content.components?.allFiles?.length ? (
                <div className="space-y-4">
                  {page.content.components.allFiles.map((file, idx) => (
                    <Card key={idx}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          {file.name}
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadComponent(file.name, file.content)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </CardHeader>
                      <CardContent>
                        <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
                          <code>{file.content}</code>
                        </pre>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-12">
                  No components available
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rationale" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Product Requirements Document</CardTitle>
              <CardDescription>
                AI-generated PRD that guided the landing page creation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap bg-muted p-6 rounded-lg">
                  {prdContent}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sitecore" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sitecore Component Exports</CardTitle>
              <CardDescription>
                Components formatted for Sitecore integration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-12">
                Sitecore exports will be available here
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
