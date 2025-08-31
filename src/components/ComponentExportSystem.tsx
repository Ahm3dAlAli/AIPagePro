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
  pageSections
}) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportedComponents, setExportedComponents] = useState<SitecoreComponent[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<'react_tsx' | 'sitecore_byoc'>('sitecore_byoc');

  const generateSitecoreComponents = async () => {
    setIsGenerating(true);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const components: SitecoreComponent[] = pageSections.map(section => {
        const componentName = `${section.section_type.charAt(0).toUpperCase()}${section.section_type.slice(1)}Section`;
        
        // Generate React component code
        const reactCode = generateReactComponent(section);
        
        // Generate JSON schema for Sitecore
        const jsonSchema = generateJSONSchema(section);
        
        // Generate Sitecore manifest
        const sitecoreManifest = generateSitecoreManifest(section, componentName);
        
        return {
          name: section.section_type,
          componentName,
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

  const generateReactComponent = (section: any): string => {
    const componentName = `${section.section_type.charAt(0).toUpperCase()}${section.section_type.slice(1)}Section`;
    
    switch (section.section_type) {
      case 'hero':
        return generateHeroComponent(section.content, componentName);
      case 'features':
        return generateFeaturesComponent(section.content, componentName);
      case 'testimonials':
        return generateTestimonialsComponent(section.content, componentName);
      case 'pricing':
        return generatePricingComponent(section.content, componentName);
      default:
        return generateGenericComponent(section.content, componentName);
    }
  };

  const generateHeroComponent = (content: any, componentName: string): string => {
    return `import React from 'react';
import { Text, Link, Image, withDatasourceCheck } from '@sitecore-jss/sitecore-jss-nextjs';
import { ComponentProps } from 'lib/component-props';

interface ${componentName}Props extends ComponentProps {
  fields: {
    headline: TextField;
    subheadline: TextField;
    ctaText: TextField;
    ctaUrl: LinkField;
    backgroundImage?: ImageField;
  };
}

const ${componentName} = ({ fields }: ${componentName}Props): JSX.Element => {
  return (
    <section className="hero-section bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
      <div className="container mx-auto px-6 text-center">
        <Text field={fields.headline} tag="h1" className="text-5xl font-bold mb-6" />
        <Text field={fields.subheadline} tag="p" className="text-xl mb-8 opacity-90" />
        
        <div className="space-x-4">
          <Link field={fields.ctaUrl} className="bg-white text-gray-900 px-8 py-3 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors inline-block">
            <Text field={fields.ctaText} />
          </Link>
        </div>
        
        {fields.backgroundImage && (
          <div className="mt-12">
            <Image field={fields.backgroundImage} className="mx-auto max-w-4xl w-full rounded-lg shadow-2xl" />
          </div>
        )}
      </div>
    </section>
  );
};

export default withDatasourceCheck()<${componentName}Props>(${componentName});`;
  };

  const generateFeaturesComponent = (content: any, componentName: string): string => {
    return `import React from 'react';
import { Text, RichText, withDatasourceCheck } from '@sitecore-jss/sitecore-jss-nextjs';
import { ComponentProps } from 'lib/component-props';

interface Feature {
  title: TextField;
  description: RichTextField;
  icon?: TextField;
}

interface ${componentName}Props extends ComponentProps {
  fields: {
    title: TextField;
    subtitle?: RichTextField;
    features: Feature[];
  };
}

const ${componentName} = ({ fields }: ${componentName}Props): JSX.Element => {
  return (
    <section className="py-16">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <Text field={fields.title} tag="h2" className="text-3xl font-bold mb-4" />
          {fields.subtitle && (
            <RichText field={fields.subtitle} className="text-lg text-gray-600" />
          )}
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {fields.features?.map((feature, index) => (
            <div key={index} className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                {feature.icon ? (
                  <Text field={feature.icon} className="text-2xl text-white" />
                ) : (
                  <span className="text-2xl text-white">⚡</span>
                )}
              </div>
              <Text field={feature.title} tag="h3" className="text-xl font-semibold mb-3" />
              <RichText field={feature.description} className="text-gray-600" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default withDatasourceCheck()<${componentName}Props>(${componentName});`;
  };

  const generateTestimonialsComponent = (content: any, componentName: string): string => {
    return `import React from 'react';
import { Text, RichText, withDatasourceCheck } from '@sitecore-jss/sitecore-jss-nextjs';
import { ComponentProps } from 'lib/component-props';

interface Testimonial {
  quote: RichTextField;
  author: TextField;
  role: TextField;
  company?: TextField;
  rating?: NumberField;
}

interface ${componentName}Props extends ComponentProps {
  fields: {
    title: TextField;
    testimonials: Testimonial[];
  };
}

const ${componentName} = ({ fields }: ${componentName}Props): JSX.Element => {
  const renderStars = (rating: number = 5) => {
    return Array(rating).fill('⭐').join('');
  };

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <Text field={fields.title} tag="h2" className="text-3xl font-bold mb-4" />
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {fields.testimonials?.map((testimonial, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex mb-4">
                <span>{renderStars(testimonial.rating?.value || 5)}</span>
              </div>
              <RichText field={testimonial.quote} className="text-gray-700 mb-4" />
              <div>
                <Text field={testimonial.author} tag="p" className="font-semibold" />
                <div className="text-sm text-gray-600">
                  <Text field={testimonial.role} />
                  {testimonial.company && (
                    <>
                      {', '}
                      <Text field={testimonial.company} />
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default withDatasourceCheck()<${componentName}Props>(${componentName});`;
  };

  const generatePricingComponent = (content: any, componentName: string): string => {
    return `import React from 'react';
import { Text, Link, RichText, withDatasourceCheck } from '@sitecore-jss/sitecore-jss-nextjs';
import { ComponentProps } from 'lib/component-props';

interface PricingPlan {
  name: TextField;
  price: TextField;
  period: TextField;
  features: TextField[];
  ctaText: TextField;
  ctaUrl: LinkField;
  highlighted?: BooleanField;
}

interface ${componentName}Props extends ComponentProps {
  fields: {
    title: TextField;
    subtitle?: RichTextField;
    plans: PricingPlan[];
  };
}

const ${componentName} = ({ fields }: ${componentName}Props): JSX.Element => {
  return (
    <section className="py-16">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <Text field={fields.title} tag="h2" className="text-3xl font-bold mb-4" />
          {fields.subtitle && (
            <RichText field={fields.subtitle} className="text-lg text-gray-600" />
          )}
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {fields.plans?.map((plan, index) => (
            <div 
              key={index} 
              className={\`bg-white border-2 \${plan.highlighted?.value ? 'border-blue-500 transform scale-105' : 'border-gray-200'} rounded-lg p-6\`}
            >
              {plan.highlighted?.value && (
                <div className="bg-blue-500 text-white text-sm font-semibold px-3 py-1 rounded-full inline-block mb-4">
                  Most Popular
                </div>
              )}
              
              <Text field={plan.name} tag="h3" className="text-xl font-bold mb-2" />
              
              <div className="mb-4">
                <Text field={plan.price} tag="span" className="text-3xl font-bold" />
                <Text field={plan.period} tag="span" className="text-gray-600" />
              </div>
              
              <ul className="space-y-2 mb-6">
                {plan.features?.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    <Text field={feature} />
                  </li>
                ))}
              </ul>
              
              <Link 
                field={plan.ctaUrl} 
                className={\`w-full py-3 px-6 rounded-lg font-semibold \${plan.highlighted?.value ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'} transition-colors text-center block\`}
              >
                <Text field={plan.ctaText} />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default withDatasourceCheck()<${componentName}Props>(${componentName});`;
  };

  const generateGenericComponent = (content: any, componentName: string): string => {
    return `import React from 'react';
import { Text, RichText, withDatasourceCheck } from '@sitecore-jss/sitecore-jss-nextjs';
import { ComponentProps } from 'lib/component-props';

interface ${componentName}Props extends ComponentProps {
  fields: {
    title?: TextField;
    content?: RichTextField;
  };
}

const ${componentName} = ({ fields }: ${componentName}Props): JSX.Element => {
  return (
    <section className="py-16">
      <div className="container mx-auto px-6">
        {fields.title && (
          <Text field={fields.title} tag="h2" className="text-3xl font-bold mb-6" />
        )}
        {fields.content && (
          <RichText field={fields.content} className="prose max-w-none" />
        )}
      </div>
    </section>
  );
};

export default withDatasourceCheck()<${componentName}Props>(${componentName});`;
  };

  const generateJSONSchema = (section: any) => {
    const componentName = `${section.section_type.charAt(0).toUpperCase()}${section.section_type.slice(1)}Section`;
    
    const baseSchema = {
      name: componentName,
      displayName: `${componentName.replace(/([A-Z])/g, ' $1').trim()}`,
      category: "PagePilot AI Components",
      icon: "/temp/PagePilotAI-Component.png",
      fields: []
    };

    // Add fields based on section type
    switch (section.section_type) {
      case 'hero':
        baseSchema.fields = [
          { name: "headline", type: "Single-Line Text", displayName: "Headline", required: true },
          { name: "subheadline", type: "Multi-Line Text", displayName: "Subheadline" },
          { name: "ctaText", type: "Single-Line Text", displayName: "CTA Text", required: true },
          { name: "ctaUrl", type: "General Link", displayName: "CTA URL", required: true },
          { name: "backgroundImage", type: "Image", displayName: "Background Image" }
        ];
        break;
        
      case 'features':
        baseSchema.fields = [
          { name: "title", type: "Single-Line Text", displayName: "Section Title", required: true },
          { name: "subtitle", type: "Rich Text", displayName: "Subtitle" },
          { name: "features", type: "Multilist", displayName: "Features", source: "datasource=/sitecore/content/Data/Features" }
        ];
        break;
        
      case 'testimonials':
        baseSchema.fields = [
          { name: "title", type: "Single-Line Text", displayName: "Section Title", required: true },
          { name: "testimonials", type: "Multilist", displayName: "Testimonials", source: "datasource=/sitecore/content/Data/Testimonials" }
        ];
        break;
        
      case 'pricing':
        baseSchema.fields = [
          { name: "title", type: "Single-Line Text", displayName: "Section Title", required: true },
          { name: "subtitle", type: "Rich Text", displayName: "Subtitle" },
          { name: "plans", type: "Multilist", displayName: "Pricing Plans", source: "datasource=/sitecore/content/Data/PricingPlans" }
        ];
        break;
        
      default:
        baseSchema.fields = [
          { name: "title", type: "Single-Line Text", displayName: "Title" },
          { name: "content", type: "Rich Text", displayName: "Content" }
        ];
    }

    return baseSchema;
  };

  const generateSitecoreManifest = (section: any, componentName: string) => {
    return {
      name: componentName,
      type: "rendering",
      params: [],
      fields: generateJSONSchema(section).fields,
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