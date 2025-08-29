import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Brain, 
  LineChart, 
  Puzzle, 
  FileText, 
  Rocket, 
  Shield,
  Sparkles,
  Target,
  Zap
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI-Driven Design",
    description: "Every layout decision backed by machine learning analysis of 10M+ landing page conversions",
    color: "text-primary"
  },
  {
    icon: LineChart,
    title: "Performance Analytics Integration",
    description: "Ingest historic campaign data and A/B test results to optimize page structure automatically",
    color: "text-success"
  },
  {
    icon: Puzzle,
    title: "Modular Components",
    description: "Export Sitecore BYOC-ready React components with JSON schemas for marketer editing",
    color: "text-warning"
  },
  {
    icon: FileText,
    title: "Explainable Decisions",
    description: "Auto-generated PDF reports explaining every design choice with data-driven reasoning",
    color: "text-primary"
  },
  {
    icon: Rocket,
    title: "One-Click Deploy",
    description: "Instant deployment to Vercel, Azure, or your preferred hosting platform",
    color: "text-success"
  },
  {
    icon: Shield,
    title: "Brand Compliance",
    description: "Automatic adherence to brand guidelines, color palettes, and typography standards",
    color: "text-warning"
  }
];

export const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 bg-background-secondary">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 text-sm mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-primary font-medium">Core Capabilities</span>
          </div>
          
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            Data-Driven Page Generation
            <span className="bg-gradient-primary bg-clip-text text-transparent"> at Scale</span>
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Transform historic campaign performance into high-converting landing pages with 
            AI reasoning that justifies every design decision.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <Card key={index} className="p-6 border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-card group">
              <div className="mb-4">
                <div className="w-12 h-12 bg-gradient-secondary rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Card className="inline-block p-8 bg-gradient-secondary border-primary/20 shadow-glow">
            <div className="flex items-center gap-4 mb-4">
              <Target className="w-6 h-6 text-primary" />
              <h3 className="text-2xl font-bold">Ready to Transform Your Campaigns?</h3>
            </div>
            <p className="text-muted-foreground mb-6 max-w-md">
              Join 500+ marketing teams using AI to generate landing pages that convert 47% better than traditional designs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="lg" className="group">
                <Zap className="w-4 h-4 mr-2" />
                Start Free Trial
              </Button>
              <Button variant="ai" size="lg">
                Schedule Demo
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};