import { Navigation } from "@/components/Navigation";
import { HeroSection } from "@/components/HeroSection";
import { FeaturesSection } from "@/components/FeaturesSection";
import { CampaignInputSection } from "@/components/CampaignInputSection";
import { AnalyticsSection } from "@/components/AnalyticsSection";
import { TemplateLibrarySection } from "@/components/TemplateLibrarySection";

const Index = () => {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navigation />
      <HeroSection />
      <FeaturesSection />
      <CampaignInputSection />
      <AnalyticsSection />
      <TemplateLibrarySection />
    </main>
  );
};

export default Index;
