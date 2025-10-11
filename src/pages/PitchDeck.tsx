import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, TrendingUp, Target, Award } from "lucide-react";

const PitchDeck = () => {
  const slides = [
    {
      title: "The Problem",
      icon: Target,
      content: "Marketing teams spend 2-3 weeks creating landing pages manually, requiring coordination between design, development, and analytics teams. By the time pages go live, market conditions have changed.",
      stats: ["2-3 weeks per page", "Multiple stakeholders", "No data-driven insights"]
    },
    {
      title: "The Solution",
      icon: Zap,
      content: "PagePilot AI automates landing page creation using your historic campaign data. Generate optimized, high-converting pages in minutes with full AI explainability.",
      stats: ["< 5 minutes generation", "Data-driven decisions", "Full transparency"]
    },
    {
      title: "How It Works",
      icon: TrendingUp,
      content: "1. Import historic campaign data\n2. AI analyzes performance patterns\n3. Generates optimized landing pages\n4. Deploy to production instantly",
      stats: ["50+ metrics analyzed", "87% confidence scores", "One-click deployment"]
    },
    {
      title: "Competitive Advantage",
      icon: Award,
      content: "Unlike traditional builders, PagePilot provides AI explainability for every design decision, maps choices to your actual performance data, and predicts outcomes with confidence intervals.",
      stats: ["Data attribution", "Performance predictions", "A/B test recommendations"]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            PagePilot AI
          </h1>
          <p className="text-xl text-muted-foreground">
            AI-Powered Landing Page Generator
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Transform Campaign Data into High-Converting Pages in Minutes
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {slides.map((slide, index) => {
            const Icon = slide.icon;
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Icon className="h-6 w-6 text-primary" />
                    {slide.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground whitespace-pre-line">
                    {slide.content}
                  </p>
                  <div className="space-y-2">
                    {slide.stats.map((stat, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <ArrowRight className="h-4 w-4 text-primary" />
                        <span>{stat}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-12 text-center space-y-6">
            <h2 className="text-3xl font-bold">Ready to Transform Your Marketing?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join marketing teams using PagePilot AI to generate data-driven landing pages 10x faster
            </p>
            <div className="flex gap-4 justify-center">
              <Button size="lg" className="gap-2">
                Start Free Trial <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline">
                View Demo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PitchDeck;
