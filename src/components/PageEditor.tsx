import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Edit3, Wand2, Eye, Save, Settings, RefreshCw, Sparkles, Brain, Download, Loader2, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import ComponentExportSystem from './ComponentExportSystem';
interface PageSection {
  id: string;
  section_type: string;
  content: any;
  version: number;
  ai_prompt?: string;
  is_active: boolean;
}
interface PageEditorProps {
  pageId: string;
  initialContent: any;
  onUpdate?: (content: any) => void;
}
const SECTION_TYPES = [{
  id: 'hero',
  name: 'Hero Section',
  icon: '🎯'
}, {
  id: 'benefits',
  name: 'Benefits',
  icon: '✨'
}, {
  id: 'features',
  name: 'Features',
  icon: '🔧'
}, {
  id: 'testimonials',
  name: 'Testimonials',
  icon: '💬'
}, {
  id: 'pricing',
  name: 'Pricing',
  icon: '💰'
}, {
  id: 'faq',
  name: 'FAQ',
  icon: '❓'
}, {
  id: 'finalCta',
  name: 'Final CTA',
  icon: '🚀'
}];
export const PageEditor: React.FC<PageEditorProps> = ({
  pageId,
  initialContent,
  onUpdate
}) => {
  const {
    toast
  } = useToast();
  const [sections, setSections] = useState<PageSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [editingSection, setEditingSection] = useState<PageSection | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isGeneratingRationale, setIsGeneratingRationale] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [aiRationaleReport, setAiRationaleReport] = useState<any>(null);
  useEffect(() => {
    loadPageSections();
  }, [pageId]);
  const loadPageSections = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('page_sections').select('*').eq('page_id', pageId).eq('is_active', true).order('section_type');
      if (error) throw error;

      // If no sections exist, create them from initial content
      if (!data || data.length === 0) {
        await createInitialSections();
      } else {
        setSections(data);
      }
    } catch (error) {
      console.error('Error loading sections:', error);
      toast({
        title: "Error",
        description: "Failed to load page sections",
        variant: "destructive"
      });
    }
  };
  const createInitialSections = async () => {
    if (!initialContent?.sections) return;
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) return;
    const sectionsToCreate = Object.entries(initialContent.sections).map(([type, content]) => ({
      page_id: pageId,
      user_id: user.id,
      section_type: type,
      content: content as any,
      version: 1,
      is_active: true
    }));
    try {
      const {
        data,
        error
      } = await supabase.from('page_sections').insert(sectionsToCreate).select();
      if (error) throw error;
      setSections(data || []);
    } catch (error) {
      console.error('Error creating initial sections:', error);
    }
  };
  const generateSection = async (sectionType: string, prompt: string) => {
    setIsGenerating(true);
    try {
      const currentSection = sections.find(s => s.section_type === sectionType);
      const {
        data,
        error
      } = await supabase.functions.invoke('generate-section', {
        body: {
          pageId,
          sectionType,
          prompt,
          currentContent: currentSection?.content
        }
      });
      if (error) throw error;
      if (data.success) {
        toast({
          title: "Section Updated!",
          description: `${sectionType} section has been regenerated with AI.`
        });
        await loadPageSections();
        setAiPrompt('');
        setEditingSection(null);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate section",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };
  const updateSection = async (section: PageSection, newContent: any) => {
    try {
      const {
        error
      } = await supabase.from('page_sections').update({
        content: newContent,
        version: section.version + 1
      }).eq('id', section.id);
      if (error) throw error;
      toast({
        title: "Section Updated",
        description: "Section content has been saved."
      });
      await loadPageSections();
      setEditingSection(null);
    } catch (error) {
      console.error('Update error:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update section",
        variant: "destructive"
      });
    }
  };
  const generateAIRationale = async () => {
    setIsGeneratingRationale(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('generate-prd', {
        body: {
          pageId
        }
      });
      if (error) throw error;
      if (data.success && data.aiRationale) {
        setAiRationaleReport(data.aiRationale);
        toast({
          title: "AI Rationale Generated!"
        });
      }
    } catch (error: any) {
      toast({
        title: "Failed to generate rationale",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingRationale(false);
    }
  };
  const generatePreview = async () => {
    setIsGeneratingPreview(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('generate-prd', {
        body: {
          pageId
        }
      });
      if (error) throw error;
      if (data.success) {
        // Open the generated page in a new tab
        const previewUrl = `https://gidmisqzkobynomutdgp.supabase.co/functions/v1/render-page/${data.generatedPage.id}`;
        window.open(previewUrl, '_blank');
        toast({
          title: "Preview Generated!",
          description: "Your landing page has been generated and opened in a new tab."
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Preview generation error:', error);
      toast({
        title: "Preview Failed",
        description: error.message || "Failed to generate preview",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingPreview(false);
    }
  };
  const renderSectionEditor = (section: PageSection) => {
    const sectionInfo = SECTION_TYPES.find(t => t.id === section.section_type);
    return <Card key={section.id} className="mb-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <span>{sectionInfo?.icon}</span>
              {sectionInfo?.name || section.section_type}
              <Badge variant="secondary">v{section.version}</Badge>
            </CardTitle>
            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Wand2 className="h-4 w-4 mr-1" />
                    AI Edit
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>AI Section Editor - {sectionInfo?.name}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="ai-prompt">Describe what you want to change:</Label>
                      <Textarea id="ai-prompt" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="e.g., Make the headline more urgent, add social proof, emphasize ROI benefits..." className="min-h-[100px]" />
                    </div>
                    <Button onClick={() => generateSection(section.section_type, aiPrompt)} disabled={!aiPrompt.trim() || isGenerating} className="w-full">
                      {isGenerating ? <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </> : <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate with AI
                        </>}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="sm" onClick={() => setEditingSection(section)}>
                <Edit3 className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-lg">
            <pre className="whitespace-pre-wrap text-sm">
              {JSON.stringify(section.content, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>;
  };
  const renderManualEditor = (section: PageSection) => {
    if (!editingSection || editingSection.id !== section.id) return null;
    return <Dialog open={true} onOpenChange={() => setEditingSection(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Section Content</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Label>Section Content (JSON)</Label>
            <Textarea value={JSON.stringify(editingSection.content, null, 2)} onChange={e => {
            try {
              const newContent = JSON.parse(e.target.value);
              setEditingSection({
                ...editingSection,
                content: newContent
              });
            } catch {
              // Invalid JSON, keep editing
            }
          }} className="min-h-[400px] font-mono text-sm" />
            <div className="flex gap-2">
              <Button onClick={() => updateSection(section, editingSection.content)}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setEditingSection(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>;
  };
  return <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Page Editor</h1>
        <div className="flex gap-2">
          <Button onClick={generatePreview} disabled={isGeneratingPreview || sections.length === 0}>
            {isGeneratingPreview ? <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating Preview...
              </> : <>
                <Eye className="h-4 w-4 mr-2" />
                Generate Preview
              </>}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="sections" className="space-y-6">
        <TabsList>
          <TabsTrigger value="sections">Section Editor</TabsTrigger>
          
          <TabsTrigger value="ai-rationale">AI Rationale</TabsTrigger>
          <TabsTrigger value="export">Sitecore Export</TabsTrigger>
        </TabsList>

        <TabsContent value="sections" className="space-y-6">
          {sections.length === 0 ? <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground mb-4">No sections found. Loading sections...</p>
                <Button onClick={loadPageSections}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload Sections
                </Button>
              </CardContent>
            </Card> : sections.map(renderSectionEditor)}
          
          {sections.map(section => renderManualEditor(section))}
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Page Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Page settings coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-rationale" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-600" />
                <CardTitle>AI Decision Rationale</CardTitle>
              </div>
              <CardDescription>
                Detailed explanation of AI-driven design decisions and performance predictions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {aiRationaleReport ? <div className="space-y-6">
                  {/* Executive Summary */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Executive Summary</h3>
                    <p className="text-muted-foreground">
                      {aiRationaleReport.executiveSummary || 'AI-generated landing page optimized for conversion based on historic campaign data and best practices.'}
                    </p>
                  </div>

                  {/* Performance Predictions */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Performance Predictions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="p-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {((aiRationaleReport.performancePredictions?.conversionRate || 0.034) * 100).toFixed(1)}%
                          </div>
                          <div className="text-sm text-muted-foreground">Predicted Conversion Rate</div>
                        </div>
                      </Card>
                      <Card className="p-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {Math.round((aiRationaleReport.performancePredictions?.confidence || 0.82) * 100)}%
                          </div>
                          <div className="text-sm text-muted-foreground">Confidence Level</div>
                        </div>
                      </Card>
                      <Card className="p-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {Math.round((aiRationaleReport.brandCompliance?.score || 0.95) * 100)}%
                          </div>
                          <div className="text-sm text-muted-foreground">Brand Compliance</div>
                        </div>
                      </Card>
                    </div>
                  </div>

                  {/* Design Decisions */}
                  {aiRationaleReport.designDecisions && aiRationaleReport.designDecisions.length > 0 && <div>
                      <h3 className="text-lg font-semibold mb-3">Design Decisions</h3>
                      <div className="space-y-4">
                        {aiRationaleReport.designDecisions.slice(0, 3).map((decision: any, index: number) => <Card key={index} className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-medium">{decision.decision || `Decision ${index + 1}`}</h4>
                              <Badge variant="secondary">
                                {Math.round((decision.confidence || 0.8) * 100)}% confidence
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {decision.reasoning || 'Decision based on best practices and data analysis.'}
                            </p>
                          </Card>)}
                      </div>
                    </div>}

                  {/* Testing Recommendations */}
                  {aiRationaleReport.testingRecommendations && <div>
                      <h3 className="text-lg font-semibold mb-3">A/B Testing Recommendations</h3>
                      <Card className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <div className="text-lg font-semibold text-green-600">
                              +{aiRationaleReport.testingRecommendations.expectedLift || 15}%
                            </div>
                            <div className="text-sm text-muted-foreground">Expected Lift</div>
                          </div>
                          <div>
                            <div className="text-lg font-semibold">
                              {aiRationaleReport.testingRecommendations.duration || '14 days'}
                            </div>
                            <div className="text-sm text-muted-foreground">Recommended Duration</div>
                          </div>
                        </div>
                        <div>
                          <h5 className="font-medium mb-2">Priority Test Elements:</h5>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {(aiRationaleReport.testingRecommendations.priorityTests || []).map((test: string, index: number) => <li key={index}>• {test}</li>)}
                          </ul>
                        </div>
                      </Card>
                    </div>}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={generateAIRationale}>
                      <Brain className="h-4 w-4 mr-2" />
                      Regenerate Analysis
                    </Button>
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF Report
                    </Button>
                  </div>
                </div> : <div className="text-center py-8">
                  <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No AI Analysis Available</h3>
                  <p className="text-muted-foreground mb-4">
                    Generate an AI rationale to see detailed decision analysis and performance predictions.
                  </p>
                  <Button onClick={generateAIRationale} disabled={isGeneratingRationale}>
                    {isGeneratingRationale ? <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Analysis...
                      </> : <>
                        <Brain className="mr-2 h-4 w-4" />
                        Generate AI Rationale
                      </>}
                  </Button>
                </div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-6">
          <ComponentExportSystem pageId={pageId || ''} pageSections={sections || []} />
        </TabsContent>
      </Tabs>
    </div>;
};