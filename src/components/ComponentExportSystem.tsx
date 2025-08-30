import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { 
  Code, 
  Download, 
  Package, 
  FileText,
  Copy,
  Eye,
  ExternalLink,
  Layers,
  Settings,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ComponentExport {
  id: string;
  component_name: string;
  component_type: string;
  react_code: string;
  json_schema: any;
  sitecore_manifest: any;
  export_format: string;
  download_count: number;
  created_at: string;
  page_id?: string;
}

const ComponentExportSystem = () => {
  const { toast } = useToast();
  const [components, setComponents] = useState<ComponentExport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComponent, setSelectedComponent] = useState<ComponentExport | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  useEffect(() => {
    loadComponents();
  }, []);

  const loadComponents = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('component_exports')
        .select(`
          *,
          generated_pages(title)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComponents(data || []);
    } catch (error: any) {
      toast({
        title: "Failed to load components",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadComponent = async (component: ComponentExport, format: 'react' | 'json' | 'sitecore' | 'zip') => {
    try {
      let content = '';
      let filename = '';
      let mimeType = 'text/plain';

      switch (format) {
        case 'react':
          content = component.react_code;
          filename = `${component.component_name}.tsx`;
          mimeType = 'text/typescript';
          break;
        case 'json':
          content = JSON.stringify(component.json_schema, null, 2);
          filename = `${component.component_name}.schema.json`;
          mimeType = 'application/json';
          break;
        case 'sitecore':
          content = JSON.stringify(component.sitecore_manifest, null, 2);
          filename = `${component.component_name}.manifest.json`;
          mimeType = 'application/json';
          break;
        case 'zip':
          // In a real implementation, you'd create a ZIP file with all assets
          content = generateCompletePackage(component);
          filename = `${component.component_name}-package.txt`;
          break;
      }

      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);

      // Update download count
      await supabase
        .from('component_exports')
        .update({ download_count: component.download_count + 1 })
        .eq('id', component.id);

      toast({
        title: "Component downloaded",
        description: `${filename} has been downloaded successfully`
      });

      loadComponents(); // Refresh to show updated download count
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: `${type} code copied successfully`
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const generateCompletePackage = (component: ComponentExport): string => {
    return `# ${component.component_name} Component Package

## React Component (${component.component_name}.tsx)
${component.react_code}

## JSON Schema (${component.component_name}.schema.json)
${JSON.stringify(component.json_schema, null, 2)}

## Sitecore Manifest (${component.component_name}.manifest.json)
${JSON.stringify(component.sitecore_manifest, null, 2)}

## Installation Instructions

### For React Projects:
1. Copy the ${component.component_name}.tsx file to your components directory
2. Import and use: import { ${component.component_name} } from './components/${component.component_name}'

### For Sitecore XM Cloud BYOC:
1. Upload the manifest.json to your Sitecore instance
2. Configure the component using the provided JSON schema
3. The component will be available in the Sitecore Pages editor

### Component Properties:
${Object.entries(component.json_schema.properties || {}).map(([key, value]: [string, any]) => 
  `- ${key}: ${value.type} - ${value.description || 'No description'}`
).join('\n')}

Generated by Autonomous AI Landing Page System
Creation Date: ${new Date(component.created_at).toLocaleString()}
`;
  };

  const getComponentIcon = (type: string) => {
    switch (type) {
      case 'hero': return '🎯';
      case 'benefits': return '✨';
      case 'features': return '🔧';
      case 'testimonials': return '💬';
      case 'pricing': return '💰';
      case 'faq': return '❓';
      case 'finalCta': return '🚀';
      default: return '📦';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" />
            Component Export System
          </h2>
          <p className="text-muted-foreground">
            Download React components and Sitecore BYOC packages generated by AI
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Components</p>
                <p className="text-2xl font-bold">{components.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Downloads</p>
                <p className="text-2xl font-bold">
                  {components.reduce((sum, c) => sum + c.download_count, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Code className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">React Components</p>
                <p className="text-2xl font-bold">
                  {components.filter(c => c.export_format === 'react_tsx').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Sitecore Ready</p>
                <p className="text-2xl font-bold">{components.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Components Table */}
      <Card>
        <CardHeader>
          <CardTitle>Generated Components</CardTitle>
          <CardDescription>
            AI-generated React components ready for deployment or Sitecore BYOC integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Component</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Downloads</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {components.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No components available. Generate a landing page to create downloadable components.
                  </TableCell>
                </TableRow>
              ) : (
                components.map((component) => (
                  <TableRow key={component.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getComponentIcon(component.component_type)}</span>
                        <div>
                          <p className="font-medium">{component.component_name}</p>
                          {component.page_id && (
                            <p className="text-xs text-muted-foreground">
                              From: {(component as any).generated_pages?.title || 'Generated Page'}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {component.component_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {component.export_format.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>{component.download_count}</TableCell>
                    <TableCell>
                      {new Date(component.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedComponent(component);
                            setShowPreviewDialog(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadComponent(component, 'react')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadComponent(component, 'zip')}
                        >
                          <Package className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-lg">{getComponentIcon(selectedComponent?.component_type || '')}</span>
              {selectedComponent?.component_name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedComponent && (
            <Tabs defaultValue="react" className="mt-4">
              <TabsList>
                <TabsTrigger value="react">React Code</TabsTrigger>
                <TabsTrigger value="schema">JSON Schema</TabsTrigger>
                <TabsTrigger value="sitecore">Sitecore Manifest</TabsTrigger>
                <TabsTrigger value="downloads">Downloads</TabsTrigger>
              </TabsList>
              
              <TabsContent value="react" className="mt-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold">React Component Code</h4>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(selectedComponent.react_code, 'React')}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadComponent(selectedComponent, 'react')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                  <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-96 text-sm">
                    <code>{selectedComponent.react_code}</code>
                  </pre>
                </div>
              </TabsContent>
              
              <TabsContent value="schema" className="mt-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold">JSON Schema Configuration</h4>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(JSON.stringify(selectedComponent.json_schema, null, 2), 'JSON Schema')}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadComponent(selectedComponent, 'json')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                  <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-96 text-sm">
                    <code>{JSON.stringify(selectedComponent.json_schema, null, 2)}</code>
                  </pre>
                </div>
              </TabsContent>
              
              <TabsContent value="sitecore" className="mt-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold">Sitecore BYOC Manifest</h4>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(JSON.stringify(selectedComponent.sitecore_manifest, null, 2), 'Sitecore Manifest')}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadComponent(selectedComponent, 'sitecore')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                  <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-96 text-sm">
                    <code>{JSON.stringify(selectedComponent.sitecore_manifest, null, 2)}</code>
                  </pre>
                </div>
              </TabsContent>
              
              <TabsContent value="downloads" className="mt-4">
                <div className="space-y-4">
                  <h4 className="font-semibold">Download Options</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      className="h-20 flex-col"
                      onClick={() => downloadComponent(selectedComponent, 'react')}
                    >
                      <Code className="h-6 w-6 mb-2" />
                      React Component (.tsx)
                    </Button>
                    <Button
                      variant="outline"
                      className="h-20 flex-col"
                      onClick={() => downloadComponent(selectedComponent, 'json')}
                    >
                      <FileText className="h-6 w-6 mb-2" />
                      JSON Schema (.json)
                    </Button>
                    <Button
                      variant="outline"
                      className="h-20 flex-col"
                      onClick={() => downloadComponent(selectedComponent, 'sitecore')}
                    >
                      <Settings className="h-6 w-6 mb-2" />
                      Sitecore Manifest (.json)
                    </Button>
                    <Button
                      className="h-20 flex-col"
                      onClick={() => downloadComponent(selectedComponent, 'zip')}
                    >
                      <Package className="h-6 w-6 mb-2" />
                      Complete Package (.txt)
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ComponentExportSystem;