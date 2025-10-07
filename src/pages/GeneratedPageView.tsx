import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Download, ExternalLink, Rocket, Edit, Save, FileCode, FileJson, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface GeneratedPage {
  id: string;
  title: string;
  content: any;
  created_at: string;
  published_url?: string;
}

interface ComponentExport {
  id: string;
  component_name: string;
  component_type: string;
  react_code: string;
  export_format: string;
  json_schema: any;
  sitecore_manifest: any;
}

export default function GeneratedPageView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState<GeneratedPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [componentExports, setComponentExports] = useState<ComponentExport[]>([]);
  const [editingFile, setEditingFile] = useState<ComponentExport | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [generatingSitecore, setGeneratingSitecore] = useState(false);
  const [fetchingFiles, setFetchingFiles] = useState(false);
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);

  useEffect(() => {
    fetchPage();
    fetchComponentExports();

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
          const newPage = payload.new as GeneratedPage;
          setPage(newPage);
          
          // If status changed from generating to completed, show success message and refetch components
          if (newPage.content?.status === 'completed') {
            toast.success("Generation Complete! Your landing page components are ready.");
            fetchComponentExports();
          } else if (newPage.content?.status === 'error') {
            toast.error("Generation failed. Please try again.");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Auto-fetch v0 files if components are empty and chatId exists
  useEffect(() => {
    const autoFetchV0Files = async () => {
      if (page && componentExports.length === 0 && page.content?.chatId && !fetchingFiles && !hasAttemptedFetch) {
        console.log('Auto-fetching v0 files...');
        setHasAttemptedFetch(true);
        await handleFetchFilesFromV0();
      }
    };

    autoFetchV0Files();
  }, [page?.id]);

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

  const fetchComponentExports = async () => {
    try {
      const { data, error } = await supabase
        .from("component_exports")
        .select("*")
        .eq("page_id", id);

      if (error) throw error;
      setComponentExports(data || []);
    } catch (error) {
      console.error("Error fetching components:", error);
    }
  };

  const handleDeploy = async () => {
    if (!page) return;
    
    setDeploying(true);
    try {
      const { data, error } = await supabase.functions.invoke("deploy-v0-app", {
        body: { pageId: page.id },
      });

      if (error) throw error;

      toast.success("Deployment successful!");
      
      // Open deployment URL in new tab
      if (data?.deploymentUrl) {
        window.open(data.deploymentUrl, "_blank");
      }
      
      // Refresh page data to show updated published_url
      fetchPage();
    } catch (error) {
      console.error("Deployment error:", error);
      toast.error("Failed to deploy page");
    } finally {
      setDeploying(false);
    }
  };

  const handleEditFile = (component: ComponentExport) => {
    setEditingFile(component);
    setEditedContent(component.react_code);
  };

  const handleSaveFile = async () => {
    if (!editingFile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("component_exports")
        .update({
          react_code: editedContent,
          updated_at: new Date().toISOString()
        })
        .eq("id", editingFile.id);

      if (error) throw error;

      toast.success("Component updated successfully");
      setEditingFile(null);
      fetchComponentExports();
    } catch (error) {
      console.error("Error updating component:", error);
      toast.error("Failed to update component");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateSitecore = async () => {
    setGeneratingSitecore(true);
    try {
      // This would call an edge function to generate Sitecore manifests
      toast.info("Sitecore component generation coming soon!");
      
      // For now, just update the sitecore_manifest field with placeholder data
      for (const component of componentExports) {
        await supabase
          .from("component_exports")
          .update({
            sitecore_manifest: {
              componentName: component.component_name,
              fields: [],
              rendering: {
                componentName: component.component_name,
                dataSource: ""
              }
            }
          })
          .eq("id", component.id);
      }
      
      fetchComponentExports();
    } catch (error) {
      console.error("Error generating Sitecore components:", error);
      toast.error("Failed to generate Sitecore components");
    } finally {
      setGeneratingSitecore(false);
    }
  };

  const handleFetchFilesFromV0 = async () => {
    if (!page?.content?.chatId) {
      toast.error("No v0 chat ID found");
      return;
    }

    setFetchingFiles(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-v0-files", {
        body: { 
          pageId: id,
          chatId: page.content.chatId 
        },
      });

      if (error) throw error;

      toast.success(`Successfully fetched ${data.savedCount} files from v0`);
      fetchComponentExports();
      fetchPage();
    } catch (error) {
      console.error("Error fetching files from v0:", error);
      toast.error("Failed to fetch files from v0");
    } finally {
      setFetchingFiles(false);
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
            <>
              <Button variant="outline" asChild>
                <a href={page.content.demoUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Preview in New Tab
                </a>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <a href={page.content.demoUrl} target="_blank" rel="noopener noreferrer">
                  Open in v0
                </a>
              </Button>
            </>
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="rationale">AI Rationale</TabsTrigger>
          <TabsTrigger value="sitecore">Sitecore</TabsTrigger>
        </TabsList>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Live Preview</CardTitle>
              <CardDescription>
                Interactive preview ONLY
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

        {/* Components Tab - List view */}
        <TabsContent value="components" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCode className="h-5 w-5" />
                React Components ({componentExports.filter(c => ['component', 'page', 'layout'].includes(c.component_type)).length})
              </CardTitle>
              <CardDescription>
                React components and layouts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {componentExports.filter(c => ['component', 'page', 'layout'].includes(c.component_type)).length > 0 ? (
                <div className="space-y-3">
                  {componentExports.filter(c => ['component', 'page', 'layout'].includes(c.component_type)).map((component) => (
                    <Card key={component.id}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div>
                          <CardTitle className="text-sm font-medium">
                            {component.component_name}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {component.component_type} • {component.export_format}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditFile(component)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadComponent(`${component.component_name}.tsx`, component.react_code)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    No components available
                  </p>
                  <Button 
                    onClick={handleFetchFilesFromV0}
                    disabled={fetchingFiles || !page.content?.chatId}
                    variant="outline"
                  >
                    {fetchingFiles ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Fetch Files from v0
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Editor Tab - Code editing */}
        <TabsContent value="editor" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* File List */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>All Files ({componentExports.length})</CardTitle>
                <CardDescription>All project files including utilities, configs, and styles</CardDescription>
              </CardHeader>
              <CardContent>
                {componentExports.length > 0 ? (
                  <div className="space-y-2">
                    {componentExports.map((component) => (
                      <button
                        key={component.id}
                        onClick={() => handleEditFile(component)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          editingFile?.id === component.id
                            ? "bg-primary/10 border-primary"
                            : "hover:bg-muted"
                        }`}
                      >
                        <p className="font-medium text-sm">{component.component_name}</p>
                        <p className="text-xs text-muted-foreground">{component.component_type}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No files available
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Code Editor */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Code Editor</CardTitle>
                <CardDescription>
                  {editingFile ? `Editing: ${editingFile.component_name}` : 'Select a file to edit'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {editingFile ? (
                  <div className="space-y-4">
                    <Textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="font-mono text-sm min-h-[600px] resize-none"
                      placeholder="Component code..."
                    />
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleSaveFile}
                        disabled={saving}
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save Changes
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => setEditingFile(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[600px] border rounded-lg bg-muted/50">
                    <p className="text-muted-foreground">Select a file from the list to start editing</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI Rationale Tab */}
        <TabsContent value="rationale" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Product Requirements Document</CardTitle>
              <CardDescription>
                AI-generated PRD that guided the landing page creation based on your historic data
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

        {/* Sitecore Tab */}
        <TabsContent value="sitecore" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileJson className="h-5 w-5" />
                Sitecore Component Exports
              </CardTitle>
              <CardDescription>
                Generate and export components for Sitecore integration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={handleGenerateSitecore}
                disabled={generatingSitecore || componentExports.length === 0}
              >
                {generatingSitecore ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileJson className="h-4 w-4 mr-2" />
                )}
                Generate Sitecore Components
              </Button>

              {componentExports.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Available for Export:</h4>
                  {componentExports.map((comp) => (
                    <Card key={comp.id}>
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{comp.component_name}</p>
                            <p className="text-sm text-muted-foreground">
                              Type: {comp.component_type} | Format: {comp.export_format}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadComponent(
                              `${comp.component_name}-sitecore.json`,
                              JSON.stringify(comp.sitecore_manifest, null, 2)
                            )}
                            disabled={!comp.sitecore_manifest || Object.keys(comp.sitecore_manifest).length === 0}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Export
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {page.published_url && (
                <div className="mt-6 p-4 border rounded-lg bg-muted/50">
                  <p className="text-sm font-medium mb-2">Deployed URL:</p>
                  <a 
                    href={page.published_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-2 text-sm"
                  >
                    {page.published_url}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}