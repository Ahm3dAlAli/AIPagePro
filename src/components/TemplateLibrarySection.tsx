import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Layers, 
  Download, 
  Copy, 
  Code, 
  Sparkles,
  Zap,
  Target,
  ShoppingBag,
  Briefcase,
  Users
} from "lucide-react";

const templates = [
  {
    name: "SaaS Lead Generation",
    category: "Software",
    conversionRate: "18.5%",
    icon: Code,
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/20"
  },
  {
    name: "E-commerce Product",
    category: "Retail",
    conversionRate: "24.2%",
    icon: ShoppingBag,
    color: "text-success",
    bgColor: "bg-success/10",
    borderColor: "border-success/20"
  },
  {
    name: "Professional Services",
    category: "Consulting",
    conversionRate: "15.8%",
    icon: Briefcase,
    color: "text-warning",
    bgColor: "bg-warning/10",
    borderColor: "border-warning/20"
  },
  {
    name: "Event Registration",
    category: "Events",
    conversionRate: "32.1%",
    icon: Users,
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/20"
  }
];

export const TemplateLibrarySection = () => {
  return (
    <section id="templates" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 text-sm mb-6">
            <Layers className="w-4 h-4 text-primary" />
            <span className="text-primary font-medium">Template Library</span>
          </div>
          
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            Reusable{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Template
            </span>{" "}
            Components
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Export modular, Sitecore BYOC-ready React components with JSON schemas 
            for marketer editing. Deploy across multiple campaigns instantly.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {templates.map((template, index) => (
            <Card key={index} className={`p-6 border-border/50 hover:${template.borderColor} transition-all duration-300 group hover:shadow-card`}>
              <div className="mb-4">
                <div className={`w-12 h-12 ${template.bgColor} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <template.icon className={`w-6 h-6 ${template.color}`} />
                </div>
                
                <h3 className="font-semibold mb-2">{template.name}</h3>
                <p className="text-sm text-muted-foreground mb-3">{template.category}</p>
                
                <div className="flex items-center justify-between mb-4">
                  <Badge variant="secondary" className={`${template.bgColor} ${template.color} ${template.borderColor}`}>
                    {template.conversionRate} CVR
                  </Badge>
                  <Target className={`w-4 h-4 ${template.color}`} />
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Copy className="w-3 h-3 mr-1" />
                    Clone
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Download className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Template Features */}
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="p-8 border-primary/20 hover:border-primary/40 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <Code className="w-6 h-6 text-primary" />
              <h3 className="text-xl font-semibold">Sitecore BYOC Ready</h3>
            </div>
            <p className="text-muted-foreground mb-4">
              All templates export as modular React components with JSON schemas, 
              enabling drag-and-drop editing in Sitecore XM Cloud.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Configurable component fields</li>
              <li>• Marketer-friendly editing</li>
              <li>• Reusable across sites</li>
              <li>• Version control integration</li>
            </ul>
          </Card>

          <Card className="p-8 bg-gradient-secondary border-primary/20">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="w-6 h-6 text-primary" />
              <h3 className="text-xl font-semibold">AI Template Optimization</h3>
            </div>
            <p className="text-muted-foreground mb-6">
              Our AI continuously analyzes template performance and suggests 
              improvements based on conversion data and user behavior patterns.
            </p>
            <Button variant="hero" className="group">
              <Zap className="w-4 h-4 mr-2" />
              Explore Templates
            </Button>
          </Card>
        </div>
      </div>
    </section>
  );
};