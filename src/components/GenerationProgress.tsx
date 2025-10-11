import { CheckCircle2, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface GenerationStep {
  id: string;
  label: string;
  status: 'pending' | 'loading' | 'complete';
}

interface GenerationProgressProps {
  steps: GenerationStep[];
}

export const GenerationProgress = ({ steps }: GenerationProgressProps) => {
  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <div className="space-y-3">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center gap-3">
              {step.status === 'complete' && (
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
              )}
              {step.status === 'loading' && (
                <Loader2 className="h-5 w-5 text-primary animate-spin flex-shrink-0" />
              )}
              {step.status === 'pending' && (
                <div className="h-5 w-5 rounded-full border-2 border-muted flex-shrink-0" />
              )}
              <span
                className={`text-sm ${
                  step.status === 'complete'
                    ? 'text-green-500 font-medium'
                    : step.status === 'loading'
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground'
                }`}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
