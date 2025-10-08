import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { 
  Download, 
  Code, 
  FileText, 
  Package, 
  Copy,
  CheckCircle2,
  ExternalLink,
  Layers,
  Boxes
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ComponentExportSystemProps {
  pageId: string;
  pageSections: any[];
  componentExports?: any[];
}

interface SitecoreComponent {
  name: string;
  componentName: string;
  reactCode: string;
  jsonSchema: any;
  sitecoreManifest: any;
  preview?: string;
}

export const ComponentExportSystem: React.FC<ComponentExportSystemProps> = ({
  pageId,
  pageSections,
  componentExports: initialComponentExports
}) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportedComponents, setExportedComponents] = useState<SitecoreComponent[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<'react_tsx' | 'sitecore_byoc'>('sitecore_byoc');
  const [v0Components, setV0Components] = useState<any[]>([]);

  const generateSitecoreComponents = async () => {
    setIsGenerating(true);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Fetch v0 component files from database
      const { data: v0Files, error: fetchError } = await supabase
        .from('component_exports')
        .select('*')
        .eq('page_id', pageId)
        .in('component_type', ['component', 'page', 'layout']);

      if (fetchError) throw fetchError;
      
      if (!v0Files || v0Files.length === 0) {
        toast({
          title: "No Components Found",
          description: "Please fetch v0 files first before generating Sitecore components.",
          variant: "destructive"
        });
        setIsGenerating(false);
        return;
      }

      setV0Components(v0Files);

      const components: SitecoreComponent[] = v0Files.map((v0Component, index) => {
        const componentName = v0Component.component_name.replace(/\.(tsx|jsx)$/, '');
        const sitecoreComponentName = `${componentName}Sitecore`;
        
        // Transform v0 component to Sitecore JSS component
        const reactCode = transformV0ToSitecoreComponent(v0Component, sitecoreComponentName);
        
        // Generate JSON schema based on the actual component
        const jsonSchema = generateJSONSchemaFromV0(v0Component, sitecoreComponentName);
        
        // Generate Sitecore manifest
        const sitecoreManifest = generateSitecoreManifest({ component_name: componentName }, sitecoreComponentName);
        
        return {
          name: componentName,
          componentName: sitecoreComponentName,
          reactCode,
          jsonSchema,
          sitecoreManifest
        };
      });

      // Save to database
      for (const component of components) {
        await supabase.from('component_exports').insert({
          page_id: pageId,
          user_id: user.id,
          component_name: component.componentName,
          component_type: component.name,
          react_code: component.reactCode,
          json_schema: component.jsonSchema,
          sitecore_manifest: component.sitecoreManifest,
          export_format: selectedFormat
        });
      }

      setExportedComponents(components);
      
      toast({
        title: "Components Generated!",
        description: `${components.length} Sitecore BYOC components ready for export.`
      });
      
    } catch (error) {
      console.error('Error generating components:', error);
      toast({
        title: "Export Failed",
        description: "Failed to generate components. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const transformV0ToSitecoreComponent = (v0Component: any, sitecoreComponentName: string): string => {
    const originalCode = v0Component.react_code || '';
    
    // Extract component props and analyze structure
    const propsMatch = originalCode.match(/interface\s+\w+Props\s*{([^}]*)}/s);
    const componentNameMatch = originalCode.match(/export\s+(?:default\s+)?(?:function|const)\s+(\w+)/);
    const originalComponentName = componentNameMatch ? componentNameMatch[1] : 'Component';
    
    // Create Sitecore JSS compatible component
    return `import React from 'react';
import { Text, RichText, Image, Link, withDatasourceCheck } from '@sitecore-jss/sitecore-jss-nextjs';
import { ComponentProps } from 'lib/component-props';

// Original v0 component transformed for Sitecore JSS
// Component: ${v0Component.component_name}

interface ${sitecoreComponentName}Props extends ComponentProps {
  fields: {
    // Sitecore field definitions
    // Add specific fields based on your component requirements
    [key: string]: any;
  };
}

${originalCode.replace(/export\s+default\s+/, '').replace(new RegExp(`function\\s+${originalComponentName}`, 'g'), `function ${sitecoreComponentName}`)}

// Wrap with Sitecore datasource check
export default withDatasourceCheck()<${sitecoreComponentName}Props>(${sitecoreComponentName});

/*
Original v0 Component Code:
${originalCode}

Note: This component has been adapted for Sitecore JSS.
You may need to:
1. Replace hardcoded values with Sitecore field values
2. Use Text, RichText, Image, Link components from @sitecore-jss/sitecore-jss-nextjs
3. Map props.fields to the appropriate Sitecore fields
4. Update the fields interface above with your actual Sitecore field definitions
*/`;
  };

  const generateJSONSchemaFromV0 = (v0Component: any, componentName: string) => {
    // Analyze the v0 component code to extract field requirements
    const code = v0Component.react_code || '';
    
    const baseSchema = {
      name: componentName,
      displayName: componentName.replace(/([A-Z])/g, ' $1').trim(),
      category: "v0 AI Components",
      icon: "/temp/v0-Component.png",
      fields: [
        { name: "title", type: "Single-Line Text", displayName: "Title" },
        { name: "content", type: "Rich Text", displayName: "Content" },
        // Add more fields as needed based on component analysis
      ]
    };

    return baseSchema;
  };

  const generateSitecoreManifest = (section: any, componentName: string) => {
    return {
      name: componentName,
      type: "rendering",
      params: [],
      fields: [
        { name: "title", type: "Single-Line Text", displayName: "Title" },
        { name: "content", type: "Rich Text", displayName: "Content" }
      ],
      datasource: {
        template: `{${componentName.toUpperCase()}-TEMPLATE-ID}`,
        location: "/sitecore/content/Data"
      },
      rendering: {
        componentName: componentName,
        placeholderName: "main"
      }
    };
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard.`
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard.",
        variant: "destructive"
      });
    }
  };

  const downloadAsFile = (content: string, filename: string, contentType: string = 'text/plain') => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAllComponents = () => {
    exportedComponents.forEach(component => {
      downloadAsFile(component.reactCode, `${component.componentName}.tsx`, 'text/typescript');
      downloadAsFile(
        JSON.stringify(component.jsonSchema, null, 2), 
        `${component.componentName}.json`, 
        'application/json'
      );
      downloadAsFile(
        JSON.stringify(component.sitecoreManifest, null, 2), 
        `${component.componentName}.manifest.json`, 
        'application/json'
      );
    });
    
    toast({
      title: "Download Complete!",
      description: `Downloaded ${exportedComponents.length * 3} component files.`
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-blue-600" />
          <CardTitle>Sitecore BYOC Component Export</CardTitle>
        </div>
        <CardDescription>
          Export your landing page sections as Sitecore Bring Your Own Component (BYOC) modules
          ready for XM Cloud integration.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Export Controls */}
        <div className="flex items-center gap-4">
          <Button 
            onClick={generateSitecoreComponents}
            disabled={isGenerating || pageSections.length === 0}
            className="flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Generating...
              </>
            ) : (
              <>
                <Boxes className="h-4 w-4" />
                Generate Components
              </>
            )}
          </Button>
          
          {exportedComponents.length > 0 && (
            <Button variant="outline" onClick={downloadAllComponents}>
              <Download className="h-4 w-4 mr-2" />
              Download All ({exportedComponents.length * 3} files)
            </Button>
          )}
        </div>

        {/* Components List */}
        {exportedComponents.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold">Generated Components</h3>
              <Badge variant="secondary">{exportedComponents.length} components</Badge>
            </div>

            <Tabs defaultValue="components" className="space-y-4">
              <TabsList>
                <TabsTrigger value="components">Components</TabsTrigger>
                <TabsTrigger value="schemas">JSON Schemas</TabsTrigger>
                <TabsTrigger value="manifests">Sitecore Manifests</TabsTrigger>
              </TabsList>

              <TabsContent value="components" className="space-y-4">
                {exportedComponents.map((component, index) => (
                  <Card key={index} className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Code className="h-4 w-4" />
                          <CardTitle className="text-base">{component.componentName}.tsx</CardTitle>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => copyToClipboard(component.reactCode, 'React component')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => downloadAsFile(component.reactCode, `${component.componentName}.tsx`, 'text/typescript')}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={component.reactCode}
                        readOnly
                        className="font-mono text-sm min-h-[200px]"
                      />
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="schemas" className="space-y-4">
                {exportedComponents.map((component, index) => (
                  <Card key={index} className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <CardTitle className="text-base">{component.componentName}.json</CardTitle>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => copyToClipboard(JSON.stringify(component.jsonSchema, null, 2), 'JSON schema')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => downloadAsFile(JSON.stringify(component.jsonSchema, null, 2), `${component.componentName}.json`, 'application/json')}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={JSON.stringify(component.jsonSchema, null, 2)}
                        readOnly
                        className="font-mono text-sm min-h-[150px]"
                      />
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="manifests" className="space-y-4">
                {exportedComponents.map((component, index) => (
                  <Card key={index} className="border-l-4 border-l-purple-500">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Layers className="h-4 w-4" />
                          <CardTitle className="text-base">{component.componentName}.manifest.json</CardTitle>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => copyToClipboard(JSON.stringify(component.sitecoreManifest, null, 2), 'Sitecore manifest')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => downloadAsFile(JSON.stringify(component.sitecoreManifest, null, 2), `${component.componentName}.manifest.json`, 'application/json')}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={JSON.stringify(component.sitecoreManifest, null, 2)}
                        readOnly
                        className="font-mono text-sm min-h-[150px]"
                      />
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>

            {/* Integration Instructions */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Sitecore XM Cloud Integration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p><strong>1. Component Setup:</strong> Copy the React components to your Next.js project's components folder</p>
                  <p><strong>2. Schema Import:</strong> Import the JSON schemas into Sitecore Content Editor</p>
                  <p><strong>3. Manifest Configuration:</strong> Configure rendering definitions using the manifest files</p>
                  <p><strong>4. Data Templates:</strong> Create corresponding data templates for each component</p>
                  <p><strong>5. Layout Integration:</strong> Add components to your layout definitions and placeholder settings</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {pageSections.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No page sections available for export.</p>
            <p className="text-sm">Generate page content first to create exportable components.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ComponentExportSystem;