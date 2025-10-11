import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Sparkles, Zap, Target, TrendingUp } from "lucide-react";
import heroImage from "@/assets/hero-ai-generator.jpg";
export const HeroSection = () => {
  return <section className="relative min-h-screen flex items-center justify-center bg-gradient-hero overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-xl animate-glow-pulse" />
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-primary-glow/10 rounded-full blur-2xl animate-glow-pulse delay-1000" />
      </div>

      <div className="container mx-auto px-4 pt-20 pb-16 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 text-sm">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-primary font-medium">AI-Powered Landing Pages</span>
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                Generate{" "}
                <span className="bg-gradient-primary bg-clip-text text-transparent">
                  Data-Driven
                </span>{" "}
                Landing Pages in Seconds
              </h1>
              
              <p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
                Transform campaign data into high-converting, SEO-optimized landing pages with AI reasoning. 
                Every design choice backed by performance insights.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="hero" size="xl" className="group">
                Start Free Trial
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">47%</div>
                <div className="text-sm text-muted-foreground">Avg. Conversion Increase</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">3.2s</div>
                <div className="text-sm text-muted-foreground">Generation Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">99.9%</div>
                <div className="text-sm text-muted-foreground">SEO Score</div>
              </div>
            </div>
          </div>

          {/* Right Column - Hero Visual */}
          <div className="relative">
            <Card className="overflow-hidden shadow-glow border-primary/20">
              <img src={heroImage} alt="AI Landing Page Generator Interface" className="w-full h-auto" />
            </Card>

            {/* Floating Elements */}
            <div className="absolute -top-4 -left-4">
              <Card className="p-3 bg-card/80 backdrop-blur-sm border-success/30 shadow-card">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-success" />
                  <span className="text-sm font-medium">+23% CVR</span>
                </div>
              </Card>
            </div>

            <div className="absolute -bottom-4 -right-4">
              <Card className="p-3 bg-card/80 backdrop-blur-sm border-primary/30 shadow-card">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">AI Optimized</span>
                </div>
              </Card>
            </div>

            <div className="absolute top-1/2 -right-8 transform -translate-y-1/2">
              <Card className="p-3 bg-card/80 backdrop-blur-sm border-warning/30 shadow-card">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-warning" />
                  <span className="text-sm font-medium">Real-time</span>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>;
};