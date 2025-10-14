import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Users, Target, Sparkles, Activity, Eye, MousePointer } from "lucide-react";
import analyticsImage from "@/assets/analytics-dashboard.jpg";
const metrics = [{
  label: "Conversion Rate",
  value: "12.4%",
  change: "+47%",
  trend: "up",
  icon: Target
}, {
  label: "Traffic Quality",
  value: "8.9/10",
  change: "+23%",
  trend: "up",
  icon: Users
}, {
  label: "Engagement Score",
  value: "94%",
  change: "+18%",
  trend: "up",
  icon: Activity
}, {
  label: "Page Load Time",
  value: "0.8s",
  change: "-62%",
  trend: "up",
  icon: Eye
}];
export const AnalyticsSection = () => {
  return <section id="analytics" className="py-24 bg-background-secondary">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Column - Analytics Dashboard */}
          <div className="relative">
            <Card className="overflow-hidden shadow-glow border-primary/20">
              <img src={analyticsImage} alt="Analytics Dashboard Interface" className="w-full h-auto" />
            </Card>

            {/* Floating Metric Cards */}
            <div className="absolute -top-4 -right-4 hidden lg:block">
              <Card className="p-4 bg-card/90 backdrop-blur-sm border-success/30 shadow-card">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-success" />
                  <div>
                    <div className="text-lg font-bold text-success">+47%</div>
                    <div className="text-xs text-muted-foreground">CVR Increase</div>
                  </div>
                </div>
              </Card>
            </div>

            <div className="absolute -bottom-6 -left-4 hidden lg:block">
              <Card className="p-4 bg-card/90 backdrop-blur-sm border-primary/30 shadow-card">
                <div className="flex items-center gap-3">
                  <MousePointer className="w-5 h-5 text-primary" />
                  <div>
                    <div className="text-lg font-bold text-primary">94%</div>
                    <div className="text-xs text-muted-foreground">Engagement</div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Right Column - Content */}
          <div className="space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 text-sm mb-6">
                <BarChart3 className="w-4 h-4 text-primary" />
                <span className="text-primary font-medium">Performance Analytics</span>
              </div>
              
              <h2 className="text-4xl font-bold mb-6">
                Real-Time{" "}
                <span className="bg-gradient-primary bg-clip-text text-transparent">
                  Performance
                </span>{" "}
                Insights
              </h2>
              
              <p className="text-xl text-muted-foreground mb-8">
                Track every metric that matters with our comprehensive analytics dashboard. 
                Monitor conversion rates, engagement, and campaign performance in real-time.
              </p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
              {metrics.map((metric, index) => <Card key={index} className="p-4 border-border/50 hover:border-primary/30 transition-all duration-300 group">
                  <div className="flex items-center justify-between mb-2">
                    <metric.icon className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                    <Badge variant="secondary" className="text-xs bg-success/10 text-success border-success/20">
                      {metric.change}
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold mb-1">{metric.value}</div>
                  <div className="text-xs text-muted-foreground">{metric.label}</div>
                </Card>)}
            </div>

            
          </div>
        </div>
      </div>
    </section>;
};