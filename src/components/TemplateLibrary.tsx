import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Plus, 
  Star, 
  Download, 
  Upload, 
  Eye, 
  Copy,
  Filter,
  Sparkles,
  TrendingUp,
  Users,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  industry_category: string;
  config: any;
  preview_url?: string;
  conversion_rate?: number;
  usage_count: number;
  complexity_score: number;
  ai_optimized: boolean;
  template_type: string;
  is_public: boolean;
  created_at: string;
  user_id: string;
}

interface TemplateLibraryProps {
  onSelectTemplate?: (template: Template) => void;
  showCreateButton?: boolean;
}

const CATEGORIES = [
  'Lead Generation',
  'Product Sales', 
  'SaaS Signup',
  'E-commerce',
  'Event Registration',
  'Newsletter',
  'App Download',
  'Service Booking'
];

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'E-commerce',
  'Real Estate',
  'Marketing',
  'Manufacturing',
  'Professional Services'
];

export const TemplateLibrary: React.FC<TemplateLibraryProps> = ({ 
  onSelectTemplate,
  showCreateButton = true 
}) => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedIndustry, setSelectedIndustry] = useState('all');
  const [sortBy, setSortBy] = useState('usage');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Create template form state
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    category: '',
    industry_category: '',
    is_public: false
  });

  useEffect(() => {
    loadTemplates();
  }, [selectedCategory, selectedIndustry, sortBy]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('templates')
        .select('*');

      // Filter by category
      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      // Filter by industry
      if (selectedIndustry !== 'all') {
        query = query.eq('industry_category', selectedIndustry);
      }

      // Sort templates
      switch (sortBy) {
        case 'usage':
          query = query.order('usage_count', { ascending: false });
          break;
        case 'conversion':
          query = query.order('conversion_rate', { ascending: false });
          break;
        case 'recent':
          query = query.order('created_at', { ascending: false });
          break;
        case 'name':
          query = query.order('name', { ascending: true });
          break;
      }

      const { data, error } = await query;

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async (fromPageId?: string) => {
    try {
      if (!newTemplate.name || !newTemplate.category) {
        toast({
          title: "Missing Information",
          description: "Please fill in template name and category",
          variant: "destructive"
        });
        return;
      }

      let templateConfig = {};
      
      if (fromPageId) {
        // Create template from existing page
        const { data: page } = await supabase
          .from('generated_pages')
          .select('content, sections_config')
          .eq('id', fromPageId)
          .single();

        if (page) {
          templateConfig = {
            content: page.content,
            sections: page.sections_config
          };
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('templates')
        .insert({
          ...newTemplate,
          user_id: user.id,
          config: templateConfig,
          template_type: 'custom',
          usage_count: 0,
          complexity_score: 1
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Template Created",
        description: "Template has been saved to your library"
      });

      setShowCreateDialog(false);
      setNewTemplate({
        name: '',
        description: '',
        category: '',
        industry_category: '',
        is_public: false
      });
      
      await loadTemplates();
    } catch (error: any) {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create template",
        variant: "destructive"
      });
    }
  };

  const useTemplate = async (template: Template) => {
    try {
      // Increment usage count
      await supabase
        .from('templates')
        .update({ usage_count: template.usage_count + 1 })
        .eq('id', template.id);

      if (onSelectTemplate) {
        onSelectTemplate(template);
      }

      toast({
        title: "Template Applied",
        description: `${template.name} template is ready to use`
      });
    } catch (error) {
      console.error('Error using template:', error);
      toast({
        title: "Error",
        description: "Failed to apply template",
        variant: "destructive"
      });
    }
  };

  const duplicateTemplate = async (template: Template) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('templates')
        .insert({
          name: `${template.name} (Copy)`,
          description: template.description,
          category: template.category,
          industry_category: template.industry_category,
          config: template.config,
          user_id: user.id,
          template_type: 'custom',
          usage_count: 0,
          complexity_score: template.complexity_score,
          is_public: false
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Template Duplicated",
        description: "Template copy has been added to your library"
      });

      await loadTemplates();
    } catch (error: any) {
      toast({
        title: "Duplication Failed",
        description: error.message || "Failed to duplicate template",
        variant: "destructive"
      });
    }
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderTemplate = (template: Template) => (
    <Card key={template.id} className="group hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{template.name}</CardTitle>
              {template.ai_optimized && (
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI Optimized
                </Badge>
              )}
              {template.template_type === 'system' && (
                <Badge variant="outline" className="text-xs">Official</Badge>
              )}
            </div>
            <CardDescription className="line-clamp-2">
              {template.description}
            </CardDescription>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <div className="flex items-center gap-1 mb-1">
              <Users className="h-3 w-3" />
              {template.usage_count}
            </div>
            {template.conversion_rate && (
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {(template.conversion_rate * 100).toFixed(1)}%
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{template.category}</Badge>
            {template.industry_category && (
              <Badge variant="secondary">{template.industry_category}</Badge>
            )}
            <Badge className="text-xs">
              Level {template.complexity_score}
            </Badge>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={() => useTemplate(template)}
              className="flex-1"
            >
              <Zap className="h-4 w-4 mr-2" />
              Use Template
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => duplicateTemplate(template)}
            >
              <Copy className="h-4 w-4" />
            </Button>
            {template.preview_url && (
              <Button variant="outline" size="sm" asChild>
                <a href={template.preview_url} target="_blank" rel="noopener noreferrer">
                  <Eye className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Template Library</h2>
          <p className="text-muted-foreground">
            Pre-built, high-converting landing page templates
          </p>
        </div>
        {showCreateButton && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Template</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="template-name">Template Name</Label>
                  <Input
                    id="template-name"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., SaaS Landing Page"
                  />
                </div>
                <div>
                  <Label htmlFor="template-description">Description</Label>
                  <Textarea
                    id="template-description"
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what this template is for..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category</Label>
                    <Select onValueChange={(value) => setNewTemplate(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(category => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Industry</Label>
                    <Select onValueChange={(value) => setNewTemplate(prev => ({ ...prev, industry_category: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDUSTRIES.map(industry => (
                          <SelectItem key={industry} value={industry}>
                            {industry}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={() => createTemplate()} className="w-full">
                  Create Template
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-64">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(category => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Industries" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Industries</SelectItem>
            {INDUSTRIES.map(industry => (
              <SelectItem key={industry} value={industry}>
                {industry}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="usage">Most Used</SelectItem>
            <SelectItem value="conversion">Best Converting</SelectItem>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="name">Name A-Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card className="p-8 text-center">
          <CardContent>
            <div className="space-y-4">
              <div className="text-muted-foreground">
                <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium">No templates found</h3>
                <p>Try adjusting your search criteria or create a new template</p>
              </div>
              {showCreateButton && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Template
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map(renderTemplate)}
        </div>
      )}
    </div>
  );
};