import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Download, ExternalLink, Rocket, Edit, Save, FileCode, FileJson, Loader2, Package, Cloud, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import JSZip from "jszip";
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
  const {
    id
  } = useParams();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [page, setPage] = useState<GeneratedPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [deploymentPlatform, setDeploymentPlatform] = useState("vercel");
  const [deploymentToken, setDeploymentToken] = useState("");
  const [componentExports, setComponentExports] = useState<ComponentExport[]>([]);
  const [editingFile, setEditingFile] = useState<ComponentExport | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [integratingSitecore, setIntegratingSitecore] = useState(false);
  const [fetchingFiles, setFetchingFiles] = useState(false);
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);
  const [aiRationale, setAiRationale] = useState<string>("");
  useEffect(() => {
    fetchPage();
    fetchComponentExports();

    // Subscribe to real-time updates
    const channel = supabase.channel('page-updates').on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'generated_pages',
      filter: `id=eq.${id}`
    }, payload => {
      const newPage = payload.new as GeneratedPage;
      setPage(newPage);

      // If status changed from generating to completed, show success message and refetch components
      if (newPage.content?.status === 'completed') {
        toast({
          title: "Generation Complete!",
          description: "Your landing page components are ready."
        });
        fetchComponentExports();
      } else if (newPage.content?.status === 'error') {
        toast({
          title: "Generation Failed",
          description: "Please try again.",
          variant: "destructive"
        });
      }
    }).subscribe();
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
      const {
        data,
        error
      } = await supabase.from("generated_pages").select("*").eq("id", id).single();
      if (error) throw error;
      setPage(data);
      setAiRationale(data?.ai_rationale || "");
    } catch (error) {
      console.error("Error fetching page:", error);
      toast({
        title: "Error",
        description: "Failed to load page",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const fetchComponentExports = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("component_exports").select("*").eq("page_id", id);
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
      // First fetch v0 files if not already fetched
      if (!componentExports || componentExports.length === 0) {
        const chatId = page.content?.chatId;
        if (chatId) {
          const {
            error: fetchError
          } = await supabase.functions.invoke("fetch-v0-files", {
            body: {
              pageId: page.id,
              chatId
            }
          });
          if (fetchError) throw fetchError;
        }
      }

      // Deploy to Vercel using the same method as regular pages
      const {
        data,
        error
      } = await supabase.functions.invoke("deploy-to-vercel", {
        body: {
          pageId: page.id
        }
      });
      if (error) throw error;
      toast({
        title: "Deployment Successful!",
        description: "Your page has been deployed to Vercel."
      });

      // Open deployment URL in new tab
      if (data?.deploymentUrl) {
        window.open(data.deploymentUrl, "_blank");
      }

      // Refresh page data to show updated published_url
      fetchPage();
    } catch (error) {
      console.error("Deployment error:", error);
      toast({
        title: "Deployment Failed",
        description: "Failed to deploy page",
        variant: "destructive"
      });
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
      const {
        error
      } = await supabase.from("component_exports").update({
        react_code: editedContent,
        updated_at: new Date().toISOString()
      }).eq("id", editingFile.id);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Component updated successfully"
      });
      setEditingFile(null);
      fetchComponentExports();
    } catch (error) {
      console.error("Error updating component:", error);
      toast({
        title: "Error",
        description: "Failed to update component",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  const handleIntegrateSitecore = async () => {
    setIntegratingSitecore(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("integrate-sitecore-xm-cloud", {
        body: {
          pageId: id
        }
      });
      if (error) throw error;
      toast({
        title: "Success",
        description: `Integrated ${data?.componentsIntegrated || 0} components to Sitecore XM Cloud`
      });

      // Download the integration package
      if (data?.integrationPackage) {
        const blob = new Blob([JSON.stringify(data.integrationPackage, null, 2)], {
          type: "application/json"
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `sitecore-integration-${id}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Error integrating Sitecore components:", error);
      toast({
        title: "Error",
        description: "Failed to integrate Sitecore components",
        variant: "destructive"
      });
    } finally {
      setIntegratingSitecore(false);
    }
  };
  const handleFetchFilesFromV0 = async () => {
    if (!page?.content?.chatId) {
      toast({
        title: "Error",
        description: "No chat ID found",
        variant: "destructive"
      });
      return;
    }
    setFetchingFiles(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("fetch-v0-files", {
        body: {
          pageId: id,
          chatId: page.content.chatId
        }
      });
      if (error) throw error;
      toast({
        title: "Success",
        description: `Successfully fetched ${data.savedCount} files`
      });
      fetchComponentExports();
      fetchPage();
    } catch (error) {
      console.error("Error fetching files:", error);
      toast({
        title: "Error",
        description: "Failed to fetch files",
        variant: "destructive"
      });
    } finally {
      setFetchingFiles(false);
    }
  };
  const downloadComponent = (fileName: string, content: string) => {
    const blob = new Blob([content], {
      type: "text/plain"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };
  const downloadAllAsZip = async () => {
    const zip = new JSZip();
    componentExports.forEach(comp => {
      if (comp.sitecore_manifest && Object.keys(comp.sitecore_manifest).length > 0) {
        // Create a folder for each component
        const folder = zip.folder(comp.component_name);
        if (folder) {
          folder.file(`${comp.component_name}.tsx`, comp.react_code);
          folder.file(`${comp.component_name}-schema.json`, JSON.stringify(comp.json_schema, null, 2));
          folder.file(`${comp.component_name}-manifest.json`, JSON.stringify(comp.sitecore_manifest, null, 2));
        }
      }
    });
    const blob = await zip.generateAsync({
      type: "blob"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sitecore-components-${page?.title || 'export'}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Export Complete",
      description: `Exported ${componentExports.filter(c => c.sitecore_manifest).length} components as ZIP`
    });
  };
  if (loading) {
    return <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>;
  }
  if (!page) {
    return <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Page not found</p>
          </CardContent>
        </Card>
      </div>;
  }

  // Show generating state while v0 is working
  const isGenerating = page.content.status === "generating";
  if (isGenerating) {
    return <div className="container mx-auto p-6 space-y-6">
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
                  Your landing page is being created with AI. This usually takes 1-2 minutes.
                  The page will automatically update when complete.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>;
  }
  const prdContent = typeof page.content.prdDocument === "string" ? page.content.prdDocument : page.content.prdDocument?.content || JSON.stringify(page.content.prdDocument, null, 2);
  return <div className="container mx-auto p-6 space-y-6">
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
      </div>

      {/* Status Badge */}
      {page.content.status && <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${page.content.status === "generating" ? "bg-yellow-500 animate-pulse" : page.content.status === "error" ? "bg-red-500" : "bg-green-500"}`} />
              <span className="text-sm font-medium capitalize">{page.content.status}</span>
            </div>
          </CardContent>
        </Card>}

      <Tabs defaultValue="preview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="rationale">AI Rationale</TabsTrigger>
          <TabsTrigger value="sitecore">Sitecore</TabsTrigger>
        </TabsList>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Live Preview</CardTitle>
                  <CardDescription>
                    Interactive preview
                  </CardDescription>
                </div>
                {page.published_url && <Button asChild>
                    <a href={page.published_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Preview in New Tab
                    </a>
                  </Button>}
              </div>
            </CardHeader>
            <CardContent>
              {page.content.demoUrl ? <iframe src={page.content.demoUrl} className="w-full h-[800px] border rounded-lg" title="Page Preview" /> : <p className="text-center text-muted-foreground py-12">
                  Preview not available
                </p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Components Tab - List view */}
        <TabsContent value="components" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    
                    React Components ({componentExports.filter(c => ['component', 'page', 'layout'].includes(c.component_type)).length})
                  </CardTitle>
                  <CardDescription>
                    React components and layouts
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={async () => {
                  const zip = new JSZip();
                  const components = componentExports.filter(c => ['component', 'page', 'layout'].includes(c.component_type));
                  components.forEach(comp => {
                    zip.file(`${comp.component_name}.tsx`, comp.react_code);
                  });
                  const blob = await zip.generateAsync({
                    type: "blob"
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${page?.title || 'components'}-all.zip`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast({
                    title: "Download Complete",
                    description: `Downloaded ${components.length} components`
                  });
                }} disabled={componentExports.filter(c => ['component', 'page', 'layout'].includes(c.component_type)).length === 0} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download All
                  </Button>
                  <Button onClick={handleFetchFilesFromV0} disabled={fetchingFiles || !page.content?.chatId} variant="outline" size="sm">
                    {fetchingFiles ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    {fetchingFiles ? 'Fetching...' : 'Refresh Files'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {componentExports.filter(c => ['component', 'page', 'layout'].includes(c.component_type)).length > 0 ? <div className="space-y-3">
                  {componentExports.filter(c => ['component', 'page', 'layout'].includes(c.component_type)).map(component => <Card key={component.id}>
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
                          <Button variant="outline" size="sm" onClick={() => handleEditFile(component)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => downloadComponent(`${component.component_name}.tsx`, component.react_code)}>
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                    </Card>)}
                </div> : <div className="text-center py-8">
                  <p className="text-muted-foreground mb-2">
                    No React components found
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {page.content?.chatId ? 'Click refresh to fetch files' : 'No files available yet'}
                  </p>
                </div>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Editor Tab - Code editing */}
        <TabsContent value="editor" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* File List */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>All Files ({componentExports.length})</CardTitle>
                    <CardDescription>All project files including utilities, configs, and styles</CardDescription>
                  </div>
                </div>
                
              </CardHeader>
              <CardContent>
                {componentExports.length > 0 ? <div className="space-y-2">
                    {componentExports.map(component => <button key={component.id} onClick={() => handleEditFile(component)} className={`w-full text-left p-3 rounded-lg border transition-colors ${editingFile?.id === component.id ? "bg-primary/10 border-primary" : "hover:bg-muted"}`}>
                        <p className="font-medium text-sm">{component.component_name}</p>
                        <p className="text-xs text-muted-foreground">{component.component_type}</p>
                      </button>)}
                  </div> : <p className="text-sm text-muted-foreground text-center py-8">
                    No files available
                  </p>}
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
                {editingFile ? <div className="space-y-4">
                    <Textarea value={editedContent} onChange={e => setEditedContent(e.target.value)} className="font-mono text-sm min-h-[600px] resize-none" placeholder="Component code..." />
                    <div className="flex gap-2">
                      <Button onClick={handleSaveFile} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Changes
                      </Button>
                      <Button variant="outline" onClick={() => setEditingFile(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div> : <div className="flex items-center justify-center h-[600px] border rounded-lg bg-muted/50">
                    <p className="text-muted-foreground">Select a file from the list to start editing</p>
                  </div>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI Rationale Tab */}
        <TabsContent value="rationale" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                AI Design Rationale
              </CardTitle>
              <CardDescription>
                Automatically generated AI insights on design decisions, UX strategy, and conversion optimization
              </CardDescription>
            </CardHeader>
            <CardContent>
              {aiRationale ? <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap bg-muted p-6 rounded-lg">
                    {aiRationale}
                  </div>
                </div> : <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Loader2 className="h-12 w-12 text-muted-foreground mb-4 animate-spin" />
                  <h3 className="text-lg font-semibold mb-2">Generating AI Rationale</h3>
                  <p className="text-muted-foreground mb-4 max-w-md">
                    AI rationale is automatically generated when your landing page is created. This should appear shortly.
                  </p>
                </div>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sitecore Tab */}
        <TabsContent value="sitecore" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                
                Sitecore Component Exports
              </CardTitle>
              <CardDescription>
                Automatically generated components for Sitecore BYOC integration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {componentExports.length > 0 && componentExports.some(comp => comp.sitecore_manifest && Object.keys(comp.sitecore_manifest).length > 0) ? <>
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={downloadAllAsZip}>
                      <Download className="h-4 w-4 mr-2" />
                      Download All as ZIP
                    </Button>
                    
                    <Button variant="outline" onClick={handleIntegrateSitecore} disabled={integratingSitecore}>
                      <Package className="h-4 w-4 mr-2" />
                      {integratingSitecore ? "Integrating..." : "Integrate to Sitecore XM Cloud"}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Available for Export:</h4>
                    {componentExports.map(comp => <Card key={comp.id}>
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{comp.component_name}</p>
                              <p className="text-sm text-muted-foreground">
                                Type: {comp.component_type} | Format: {comp.export_format}
                              </p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => downloadComponent(`${comp.component_name}-sitecore.json`, JSON.stringify(comp.sitecore_manifest, null, 2))} disabled={!comp.sitecore_manifest || Object.keys(comp.sitecore_manifest).length === 0}>
                              <Download className="h-4 w-4 mr-2" />
                              Export
                            </Button>
                          </div>
                        </CardContent>
                      </Card>)}
                  </div>
                </> : <div className="flex flex-col items-center justify-center py-12 text-center">
                  
                  
                  
                  <Button onClick={async () => {
                setIntegratingSitecore(true);
                try {
                  const {
                    error
                  } = await supabase.functions.invoke('generate-sitecore-components', {
                    body: {
                      pageId: id
                    }
                  });
                  if (error) throw error;
                  toast({
                    title: "Generation Started",
                    description: "Sitecore components are being generated. This may take a moment."
                  });

                  // Refresh component exports after a delay
                  setTimeout(() => {
                    fetchComponentExports();
                    setIntegratingSitecore(false);
                  }, 3000);
                } catch (error) {
                  console.error('Error generating Sitecore components:', error);
                  toast({
                    title: "Generation Failed",
                    description: "Failed to generate Sitecore components. Please try again.",
                    variant: "destructive"
                  });
                  setIntegratingSitecore(false);
                }
              }} disabled={integratingSitecore}>
                    <Package className="h-4 w-4 mr-2" />
                    {integratingSitecore ? "Generating..." : "Generate Now"}
                  </Button>
                </div>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>;
}