import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Check, Star, Shield, Heart, Zap, Package, Settings, Layers, Play, Book, ChevronDown } from 'lucide-react';

interface PageData {
  id: string;
  title: string;
  content: any;
  seo_config: any;
}

const Preview = () => {
  const { pageId } = useParams<{ pageId: string }>();
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (pageId) {
      loadPageData();
    }
  }, [pageId]);

  const loadPageData = async () => {
    try {
      const { data, error } = await supabase
        .from('generated_pages')
        .select('*')
        .eq('id', pageId)
        .maybeSingle();

      if (error) throw error;
      setPageData(data);
    } catch (error) {
      console.error('Error loading page:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIconComponent = (iconName: string) => {
    const icons: any = {
      'check-circle': Check,
      'star': Star,
      'shield': Shield,
      'heart': Heart,
      'lightning': Zap,
      'package': Package,
      'settings': Settings,
      'layers': Layers,
      'tool': Settings,
      'play': Play,
      'book': Book,
      'zap': Zap
    };
    return icons[iconName] || Check;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!pageData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Page not found</h2>
          <p className="text-gray-600">The page you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const sections = pageData.content?.sections || {};
  const hero = sections.hero || {};
  const benefits = sections.benefits || {};
  const features = sections.features || {};
  const testimonials = sections.testimonials || {};
  const pricing = sections.pricing || {};
  const faq = sections.faq || {};
  const finalCta = sections.finalCta || {};

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 text-white py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-6">
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              {hero.headline || 'Transform Your Business Today'}
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto">
              {hero.subheadline || 'Discover the perfect solution for your needs'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 text-lg px-8 py-6">
                {hero.ctaText || 'Get Started Free'}
              </Button>
            </div>
            
            {hero.dataInsights && (
              <div className="pt-8 flex justify-center gap-8 text-sm">
                <div className="text-blue-100">
                  <div className="font-semibold">Top Channel</div>
                  <div>{hero.dataInsights.topChannel}</div>
                </div>
                <div className="text-blue-100">
                  <div className="font-semibold">Avg Conv Rate</div>
                  <div>{hero.dataInsights.avgConversionRate}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      {benefits.benefits && benefits.benefits.length > 0 && (
        <section className="py-20 px-6 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              {benefits.title || 'Why Choose Us'}
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {benefits.benefits.map((benefit: any, index: number) => {
                const IconComponent = getIconComponent(benefit.icon);
                return (
                  <div key={index} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <IconComponent className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-2">{benefit.title}</h3>
                        <p className="text-gray-600">{benefit.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      {features.features && features.features.length > 0 && (
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              {features.title || 'What You Get'}
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.features.map((feature: any, index: number) => {
                const IconComponent = getIconComponent(feature.icon);
                return (
                  <div key={index} className="p-6 border border-gray-200 rounded-lg hover:border-blue-500 transition-colors">
                    <IconComponent className="h-8 w-8 text-blue-600 mb-4" />
                    <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                    <p className="text-gray-600">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Testimonials Section */}
      {testimonials.testimonials && testimonials.testimonials.length > 0 && (
        <section className="py-20 px-6 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              {testimonials.title || 'What Our Customers Say'}
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.testimonials.map((testimonial: any, index: number) => (
                <div key={index} className="bg-white p-6 rounded-xl shadow-sm">
                  <div className="flex mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-4 italic">"{testimonial.quote}"</p>
                  <div>
                    <div className="font-semibold">{testimonial.author}</div>
                    <div className="text-sm text-gray-600">{testimonial.company}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pricing Section */}
      {pricing.plans && pricing.plans.length > 0 && (
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              {pricing.title || 'Choose Your Plan'}
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {pricing.plans.map((plan: any, index: number) => (
                <div 
                  key={index} 
                  className={`p-8 rounded-xl border-2 ${
                    plan.highlighted 
                      ? 'border-blue-600 shadow-xl scale-105' 
                      : 'border-gray-200'
                  }`}
                >
                  {plan.highlighted && (
                    <div className="bg-blue-600 text-white text-sm font-semibold px-4 py-1 rounded-full inline-block mb-4">
                      Most Popular
                    </div>
                  )}
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-gray-600">/{plan.period}</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature: string, fIndex: number) => (
                      <li key={fIndex} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={`w-full ${
                      plan.highlighted 
                        ? 'bg-blue-600 hover:bg-blue-700' 
                        : 'bg-gray-800 hover:bg-gray-900'
                    }`}
                    size="lg"
                  >
                    Get Started
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ Section */}
      {faq.questions && faq.questions.length > 0 && (
        <section className="py-20 px-6 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              {faq.title || 'Frequently Asked Questions'}
            </h2>
            <div className="space-y-4">
              {faq.questions.map((item: any, index: number) => (
                <div key={index} className="bg-white p-6 rounded-lg shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">{item.question}</h3>
                      <p className="text-gray-600">{item.answer}</p>
                    </div>
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Final CTA Section */}
      {finalCta.headline && (
        <section className="py-20 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h2 className="text-3xl md:text-5xl font-bold">
              {finalCta.headline}
            </h2>
            <p className="text-xl text-blue-100">
              {finalCta.subtext}
            </p>
            <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 text-lg px-8 py-6">
              {finalCta.ctaText || 'Get Started Now'}
            </Button>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <p>© 2025 {pageData.title}. All rights reserved.</p>
          <p className="text-sm mt-2">Generated with AI-powered optimization</p>
        </div>
      </footer>
    </div>
  );
};

export default Preview;
