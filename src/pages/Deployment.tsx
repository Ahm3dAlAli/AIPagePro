import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Rocket, ExternalLink, CheckCircle, XCircle, Clock, Pause, Play, Trash2, Settings, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
interface DeploymentRecord {
  id: string;
  page_id: string;
  deployment_platform: string;
  deployment_url: string | null;
  deployment_status: string;
  deployed_at: string | null;
  error_logs: string | null;
  generated_pages?: {
    title: string;
  };
}
const Deployment = () => {
  const {
    toast
  } = useToast();
  const [deployments, setDeployments] = useState<DeploymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeployment, setSelectedDeployment] = useState<DeploymentRecord | null>(null);
  const [platformDialogOpen, setPlatformDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newPlatform, setNewPlatform] = useState("vercel");
  const [platformToken, setPlatformToken] = useState("");
  useEffect(() => {
    fetchData();
  }, []);
  const fetchData = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      const {
        data,
        error
      } = await supabase.from("deployment_records").select(`
          *,
          generated_pages (
            title
          )
        `).eq("user_id", user.id).order("deployed_at", {
        ascending: false
      });
      if (error) throw error;
      if (data) setDeployments(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handlePauseResume = async (deploymentId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'success' ? 'paused' : 'success';
    try {
      const {
        error
      } = await supabase.from('deployment_records').update({
        deployment_status: newStatus
      }).eq('id', deploymentId);
      if (error) throw error;
      toast({
        title: newStatus === 'paused' ? "Deployment Paused" : "Deployment Resumed",
        description: `The deployment has been ${newStatus === 'paused' ? 'paused' : 'resumed'}.`
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const handleDelete = async () => {
    if (!selectedDeployment) return;
    try {
      const {
        error
      } = await supabase.from('deployment_records').delete().eq('id', selectedDeployment.id);
      if (error) throw error;
      toast({
        title: "Deployment Deleted",
        description: "The deployment record has been removed."
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setDeleteDialogOpen(false);
      setSelectedDeployment(null);
    }
  };
  const handleChangePlatform = async () => {
    if (!selectedDeployment) return;
    
    // Only require token for non-Vercel platforms
    if (newPlatform !== 'vercel' && !platformToken) {
      toast({
        title: "Validation Error",
        description: "Please provide the platform access token",
        variant: "destructive"
      });
      return;
    }
    try {
      const {
        error
      } = await supabase.from('deployment_records').update({
        deployment_platform: newPlatform,
        deployment_status: 'pending'
      }).eq('id', selectedDeployment.id);
      if (error) throw error;
      toast({
        title: "Platform Updated",
        description: `Deployment platform changed to ${newPlatform}. You'll need to redeploy.`
      });
      setPlatformDialogOpen(false);
      setSelectedDeployment(null);
      setPlatformToken("");
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };
  return <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Deployment Management</h1>
          <p className="text-muted-foreground">Manage and monitor your deployments</p>
        </div>
        <Button variant="outline" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Deployment History */}
      <Card>
        
        <CardContent>
          {loading ? <p className="text-center text-muted-foreground py-8">Loading deployments...</p> : deployments.length === 0 ? <div className="text-center py-12">
                <Rocket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No deployments yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Deploy pages from the My Pages section
                </p>
              </div> : <div className="space-y-4">
              {deployments.map(deployment => <Card key={deployment.id} className="border-l-4" style={{
            borderLeftColor: deployment.deployment_status === 'success' ? '#10b981' : deployment.deployment_status === 'failed' ? '#ef4444' : deployment.deployment_status === 'paused' ? '#f59e0b' : '#6b7280'
          }}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        {getStatusIcon(deployment.deployment_status)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-lg">
                              {deployment.generated_pages?.title || 'Untitled Page'}
                            </p>
                            <Badge variant={deployment.deployment_status === 'success' ? 'default' : deployment.deployment_status === 'paused' ? 'secondary' : 'destructive'}>
                              {deployment.deployment_status}
                            </Badge>
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <p className="flex items-center gap-2">
                              <span className="font-medium">Platform:</span>
                              <span className="capitalize">{deployment.deployment_platform}</span>
                            </p>
                            <p className="flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              {deployment.deployed_at ? new Date(deployment.deployed_at).toLocaleString() : "Pending"}
                            </p>
                          </div>
                          {deployment.deployment_url && <a href={deployment.deployment_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline inline-flex items-center gap-1 mt-2">
                              {deployment.deployment_url}
                              <ExternalLink className="h-3 w-3" />
                            </a>}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {deployment.deployment_status === 'success' && <Button variant="outline" size="sm" onClick={() => handlePauseResume(deployment.id, deployment.deployment_status)} title="Pause deployment">
                            <Pause className="h-4 w-4" />
                          </Button>}
                        
                        {deployment.deployment_status === 'paused' && <Button variant="outline" size="sm" onClick={() => handlePauseResume(deployment.id, deployment.deployment_status)} title="Resume deployment">
                            <Play className="h-4 w-4" />
                          </Button>}

                        <Button variant="outline" size="sm" onClick={() => {
                    setSelectedDeployment(deployment);
                    setNewPlatform(deployment.deployment_platform);
                    setPlatformDialogOpen(true);
                  }} title="Change platform">
                          <Settings className="h-4 w-4" />
                        </Button>

                        <Button variant="outline" size="sm" onClick={() => {
                    setSelectedDeployment(deployment);
                    setDeleteDialogOpen(true);
                  }} title="Delete deployment" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {deployment.error_logs && <div className="mt-3 p-3 bg-destructive/10 rounded-md">
                        <p className="text-sm text-destructive font-medium mb-1">Error Log:</p>
                        <p className="text-sm text-destructive/90">{deployment.error_logs}</p>
                      </div>}
                  </CardContent>
                </Card>)}
            </div>}
        </CardContent>
      </Card>

      {/* Change Platform Dialog */}
      <Dialog open={platformDialogOpen} onOpenChange={setPlatformDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Deployment Platform</DialogTitle>
            <DialogDescription>
              Update the platform for this deployment. {newPlatform !== 'vercel' && "You'll need to provide an access token for the new platform."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Current Platform</Label>
              <p className="text-sm text-muted-foreground capitalize">
                {selectedDeployment?.deployment_platform}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="platform">New Platform</Label>
              <Select value={newPlatform} onValueChange={setNewPlatform}>
                <SelectTrigger id="platform">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vercel">Vercel</SelectItem>
                  <SelectItem value="azure">Azure</SelectItem>
                  <SelectItem value="netlify">Netlify</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newPlatform !== 'vercel' && (
              <div className="space-y-2">
                <Label htmlFor="token">Platform Access Token</Label>
                <Input id="token" type="password" placeholder="Enter your platform access token" value={platformToken} onChange={e => setPlatformToken(e.target.value)} />
                <p className="text-xs text-muted-foreground">
                  This token will be securely stored and used for deployment operations
                </p>
              </div>
            )}
            
            {newPlatform === 'vercel' && (
              <p className="text-sm text-muted-foreground">
                Vercel deployments will use your configured Vercel API token.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPlatformDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangePlatform}>
              Update Platform
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deployment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this deployment record? This will not affect the live deployment, only remove it from your tracking.
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
export default Deployment;