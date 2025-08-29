import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  Target, 
  Users, 
  MessageSquare, 
  Palette,
  BarChart3,
  FileText,
  Rocket
} from "lucide-react";

const inputCategories = [
  {
    icon: Target,
    title: "Campaign Objectives",
    fields: ["Primary Conversion KPI", "Target Audience", "Product/Service Name"],
    color: "text-primary"
  },
  {
    icon: MessageSquare,
    title: "Content & Messaging",
    fields: ["Unique Value Proposition", "Top Benefits", "Emotional Triggers"],
    color: "text-success"
  },
  {
    icon: Users,
    title: "Audience Insights",
    fields: ["Buyer Personas", "Pain Points", "Objections to Overcome"],
    color: "text-warning"
  },
  {
    icon: Palette,
    title: "Brand Assets",
    fields: ["Brand Colors", "Logo Upload", "Font Guidelines"],
    color: "text-primary"
  }
];

export const CampaignInputSection = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Column - Input Form Preview */}
          <div className="space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 text-sm mb-6">
                <FileText className="w-4 h-4 text-primary" />
                <span className="text-primary font-medium">Input Parameters</span>
              </div>
              
              <h2 className="text-4xl font-bold mb-6">
                Smart Campaign Input{" "}
                <span className="bg-gradient-primary bg-clip-text text-transparent">
                  Collection
                </span>
              </h2>
              
              <p className="text-xl text-muted-foreground mb-8">
                Our AI captures comprehensive campaign data through an intelligent form wizard 
                that guides marketers through optimal input collection.
              </p>
            </div>

            <Card className="p-6 border-primary/20 shadow-card">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="campaign-objective" className="text-sm font-medium mb-2 block">
                    Campaign Objective *
                  </Label>
                  <Input 
                    id="campaign-objective"
                    placeholder="e.g., Generate qualified leads for enterprise software demo"
                    className="bg-background-secondary border-border/50"
                  />
                </div>
                
                <div>
                  <Label htmlFor="target-audience" className="text-sm font-medium mb-2 block">
                    Target Audience Description *
                  </Label>
                  <Textarea 
                    id="target-audience"
                    placeholder="e.g., CTOs and IT Directors at mid-market companies (100-1000 employees) looking to modernize their tech stack..."
                    className="bg-background-secondary border-border/50 min-h-[100px]"
                  />
                </div>
                
                <div>
                  <Label htmlFor="value-prop" className="text-sm font-medium mb-2 block">
                    Unique Value Proposition *
                  </Label>
                  <Input 
                    id="value-prop"
                    placeholder="e.g., Reduce deployment time by 80% with zero-config cloud infrastructure"
                    className="bg-background-secondary border-border/50"
                  />
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    <BarChart3 className="w-3 h-3 mr-1" />
                    Historic Data Connected
                  </Badge>
                  <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                    <Target className="w-3 h-3 mr-1" />
                    A/B Test Insights
                  </Badge>
                </div>
              </div>
            </Card>

            <Button variant="glow" size="lg" className="w-full group">
              <Rocket className="w-5 h-5 mr-2 group-hover:translate-x-1 transition-transform" />
              Generate AI Landing Page
            </Button>
          </div>

          {/* Right Column - Input Categories */}
          <div className="space-y-6">
            {inputCategories.map((category, index) => (
              <Card key={index} className="p-6 border-border/50 hover:border-primary/30 transition-all duration-300 group">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gradient-secondary rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <category.icon className={`w-5 h-5 ${category.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">{category.title}</h3>
                    <div className="space-y-1">
                      {category.fields.map((field, fieldIndex) => (
                        <div key={fieldIndex} className="text-sm text-muted-foreground">
                          • {field}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            <Card className="p-6 bg-gradient-secondary border-primary/20">
              <div className="flex items-center gap-3 mb-3">
                <Sparkles className="w-5 h-5 text-primary" />
                <h4 className="font-semibold">AI Enhancement</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Our AI analyzes your inputs against 10M+ successful campaigns, suggests optimizations, 
                and pre-fills fields based on industry best practices.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};