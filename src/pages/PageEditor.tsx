import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { PageEditor as PageEditorComponent } from '@/components/PageEditor';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PageData {
  id: string;
  title: string;
  content: any;
  slug: string;
  status: string;
}

const PageEditor = () => {
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (pageId) {
      loadPageData();
    }
  }, [pageId]);

  const loadPageData = async () => {
    try {
      const { data, error } = await supabase
        .from('generated_pages')
        .select('*')
        .eq('id', pageId)
        .single();

      if (error) throw error;
      setPageData(data);
    } catch (error) {
      console.error('Error loading page:', error);
      toast({
        title: "Error",
        description: "Failed to load page data",
        variant: "destructive"
      });
      navigate('/dashboard/pages');
    } finally {
      setLoading(false);
    }
  };

  const handlePageUpdate = (content: any) => {
    if (pageData) {
      setPageData({ ...pageData, content });
    }
  };

  const handlePreviewInNewTab = () => {
    if (!pageData?.content) return;
    
    // Create HTML content for the preview
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${pageData.title}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
          body { font-family: 'Inter', sans-serif; }
        </style>
      </head>
      <body>
        <div id="preview-content">
          ${JSON.stringify(pageData.content)}
        </div>
        <script>
          // Simple renderer for the page content
          const content = JSON.parse(document.getElementById('preview-content').textContent);
          document.getElementById('preview-content').innerHTML = '';
          
          // Basic rendering logic - this would need to be expanded based on your content structure
          if (content.sections) {
            content.sections.forEach(section => {
              const sectionEl = document.createElement('section');
              sectionEl.className = 'py-12 px-6';
              if (section.content) {
                sectionEl.innerHTML = section.content;
              }
              document.getElementById('preview-content').appendChild(sectionEl);
            });
          } else {
            document.getElementById('preview-content').innerHTML = '<div class="p-8 text-center">Preview content will be rendered here</div>';
          }
        </script>
      </body>
      </html>
    `;
    
    // Create blob URL and open in new tab
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    
    // Clean up the blob URL after a short delay
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!pageData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Page not found</h2>
          <p className="text-muted-foreground mb-4">The page you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/dashboard/pages')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Pages
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/dashboard/pages')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Pages
              </Button>
              <div>
                <h1 className="text-xl font-semibold">{pageData.title}</h1>
                <p className="text-sm text-muted-foreground">
                  Status: {pageData.status} • Slug: /{pageData.slug}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePreviewInNewTab}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Editor */}
      <PageEditorComponent
        pageId={pageData.id}
        initialContent={pageData.content}
        onUpdate={handlePageUpdate}
      />
    </div>
  );
};

export default PageEditor;