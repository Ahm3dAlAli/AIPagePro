import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Rocket, ExternalLink, CheckCircle, XCircle, Clock } from "lucide-react";
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
}
const Deployment = () => {
  const {
    toast
  } = useToast();
  const [pages, setPages] = useState<any[]>([]);
  const [deployments, setDeployments] = useState<DeploymentRecord[]>([]);
  const [selectedPage, setSelectedPage] = useState("");
  const [platform, setPlatform] = useState("vercel");
  const [deploying, setDeploying] = useState(false);
  const [loading, setLoading] = useState(true);
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
      const [pagesResult, deploymentsResult] = await Promise.all([supabase.from("generated_pages").select("*").eq("user_id", user.id).order("created_at", {
        ascending: false
      }), supabase.from("deployment_records").select("*").eq("user_id", user.id).order("deployed_at", {
        ascending: false
      })]);
      if (pagesResult.data) setPages(pagesResult.data);
      if (deploymentsResult.data) setDeployments(deploymentsResult.data);
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
  const deployToVercel = async () => {
    if (!selectedPage) {
      toast({
        title: "Validation Error",
        description: "Please select a page to deploy",
        variant: "destructive"
      });
      return;
    }
    setDeploying(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("deploy-to-vercel", {
        body: {
          pageId: selectedPage
        }
      });
      if (error) throw error;
      toast({
        title: "Deployment Started",
        description: "Your page is being deployed to Vercel"
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Deployment Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setDeploying(false);
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
      <div className="flex items-center gap-2 mb-6">
        <Rocket className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Deploy Your Pages</h1>
      </div>

      {/* Deploy New Page */}
      <Card>
        <CardHeader>
          <CardTitle>Deploy to Platform</CardTitle>
          <CardDescription>Select a page and platform to deploy</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="page">Select Page</Label>
            <Select value={selectedPage} onValueChange={setSelectedPage}>
              <SelectTrigger id="page">
                <SelectValue placeholder="Choose a page to deploy" />
              </SelectTrigger>
              <SelectContent>
                {pages.map((page) => (
                  <SelectItem key={page.id} value={page.id}>
                    {page.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="platform">Platform</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger id="platform">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vercel">Vercel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={deployToVercel} 
            disabled={deploying || !selectedPage}
            className="w-full"
          >
            {deploying ? "Deploying..." : "Deploy Now"}
          </Button>
        </CardContent>
      </Card>

      {/* Deployment History */}
      <Card>
        <CardHeader>
          <CardTitle>Deployment History</CardTitle>
          <CardDescription>Track all your deployments</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-center text-muted-foreground py-8">Loading deployments...</p> : deployments.length === 0 ? <p className="text-center text-muted-foreground py-8">No deployments yet</p> : <div className="space-y-4">
              {deployments.map(deployment => <Card key={deployment.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(deployment.deployment_status)}
                        <div>
                          <p className="font-medium">{deployment.deployment_platform}</p>
                          <p className="text-sm text-muted-foreground">
                            {deployment.deployed_at ? new Date(deployment.deployed_at).toLocaleString() : "Pending"}
                          </p>
                        </div>
                      </div>
                      {deployment.deployment_url && <Button variant="outline" size="sm" onClick={() => window.open(deployment.deployment_url!, "_blank")}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Live
                        </Button>}
                    </div>
                    {deployment.error_logs && <p className="text-sm text-red-500 mt-2">{deployment.error_logs}</p>}
                  </CardContent>
                </Card>)}
            </div>}
        </CardContent>
      </Card>
    </div>;
};
export default Deployment;