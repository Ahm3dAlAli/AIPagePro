import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Globe, Search, Plus, MoreHorizontal, Eye, Edit, Copy, Trash2, ExternalLink, BarChart3, Calendar, TrendingUp, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
interface GeneratedPage {
  id: string;
  title: string;
  slug: string;
  status: string;
  created_at: string;
  updated_at: string;
  published_url?: string;
  content: any;
}
const MyPages = () => {
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const [pages, setPages] = useState<GeneratedPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<string | null>(null);
  useEffect(() => {
    if (user) {
      fetchPages();
    }
  }, [user]);
  const fetchPages = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('generated_pages').select('*').eq('user_id', user?.id).order('created_at', {
        ascending: false
      });
      if (error) throw error;
      setPages(data || []);
    } catch (error: any) {
      toast({
        title: "Failed to fetch pages",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleDelete = async () => {
    if (!pageToDelete) return;
    try {
      const {
        error
      } = await supabase.from('generated_pages').delete().eq('id', pageToDelete);
      if (error) throw error;
      setPages(pages.filter(page => page.id !== pageToDelete));
      toast({
        title: "Page deleted",
        description: "The page has been permanently deleted."
      });
    } catch (error: any) {
      toast({
        title: "Failed to delete page",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setDeleteDialogOpen(false);
      setPageToDelete(null);
    }
  };
  const confirmDelete = (pageId: string) => {
    setPageToDelete(pageId);
    setDeleteDialogOpen(true);
  };
  const handleDuplicate = async (page: GeneratedPage) => {
    try {
      const {
        data,
        error
      } = await supabase.from('generated_pages').insert({
        user_id: user?.id,
        title: `${page.title} (Copy)`,
        slug: `${page.slug}-copy-${Date.now()}`,
        content: page.content,
        seo_config: page.content?.seo_config,
        status: 'draft'
      }).select().single();
      if (error) throw error;
      setPages([data, ...pages]);
      toast({
        title: "Page duplicated",
        description: "A copy of the page has been created."
      });
    } catch (error: any) {
      toast({
        title: "Failed to duplicate page",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const filteredPages = pages.filter(page => page.title.toLowerCase().includes(searchQuery.toLowerCase()) || page.slug.toLowerCase().includes(searchQuery.toLowerCase()));
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  if (loading) {
    return <div className="p-6">
        <div className="space-y-4">
          <div className="h-8 bg-muted rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({
            length: 6
          }).map((_, i) => <div key={i} className="h-48 bg-muted rounded animate-pulse" />)}
          </div>
        </div>
      </div>;
  }
  return <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">My Pages</h1>
          <p className="text-muted-foreground">
            Manage your AI-generated landing pages
          </p>
        </div>
        <Button asChild>
          <Link to="/dashboard/create">
            <Plus className="mr-2 h-4 w-4" />
            Create New Page
          </Link>
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search pages..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Pages</p>
                <p className="text-2xl font-bold">{pages.length}</p>
              </div>
              <Globe className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Published</p>
                <p className="text-2xl font-bold">
                  {pages.filter(p => p.status === 'published').length}
                </p>
              </div>
              <ExternalLink className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Drafts</p>
                <p className="text-2xl font-bold">
                  {pages.filter(p => p.status === 'draft').length}
                </p>
              </div>
              <Edit className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">
                  {pages.filter(p => {
                  const pageDate = new Date(p.created_at);
                  const now = new Date();
                  return pageDate.getMonth() === now.getMonth() && pageDate.getFullYear() === now.getFullYear();
                }).length}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pages Grid */}
      {filteredPages.length === 0 ? <Card className="p-12 text-center">
          <div className="space-y-4">
            <Globe className="h-12 w-12 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-semibold">No pages found</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {pages.length === 0 ? "You haven't created any landing pages yet. Create your first AI-generated page to get started." : "No pages match your search criteria. Try adjusting your search terms."}
            </p>
            {pages.length === 0 && <Button asChild>
                <Link to="/dashboard/create">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Page
                </Link>
              </Button>}
          </div>
        </Card> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPages.map(page => <Card key={page.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">
                      {page.title}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      {formatDate(page.created_at)}
                    </CardDescription>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/dashboard/pages/${page.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Preview
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(page)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => confirmDelete(page.id)} className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge className={getStatusColor(page.status)}>
                      {page.status}
                    </Badge>
                    {page.published_url && <Button variant="ghost" size="sm" asChild>
                        <a href={page.published_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>}
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    <p className="mb-2">/{page.slug}</p>
                    {page.content?.sections?.hero?.headline && <p className="line-clamp-2">
                        {page.content.sections.hero.headline}
                      </p>}
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" asChild className="flex-1">
                      <Link to={`/dashboard/pages/${page.id}`}>
                        <Eye className="mr-2 h-3 w-3" />
                        Preview
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/dashboard/analytics?page=${page.id}`}>
                        <BarChart3 className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>)}
        </div>}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Page</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this page? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
};
export default MyPages;