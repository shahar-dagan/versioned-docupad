
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Book, ChevronRight, Wand2 } from 'lucide-react';
import { Repository } from '@/types';
import { CreateFeatureDialog } from './CreateFeatureDialog';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface FeaturesHeaderProps {
  productName: string;
  productId: string;
  userId: string;
  featuresCount: number;
  repository?: Repository;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  onFeatureCreated: () => void;
  analysisProgress?: {
    progress: number | null;
    status: string;
    steps: { step: string; timestamp: string }[];
  } | null;
}

export function FeaturesHeader({
  productName,
  productId,
  userId,
  featuresCount,
  repository,
  onAnalyze,
  isAnalyzing,
  onFeatureCreated,
  analysisProgress,
}: FeaturesHeaderProps) {
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const isInProgress = analysisProgress?.status === 'pending' || analysisProgress?.status === 'in_progress';
  const showProgress = isAnalyzing || isInProgress;
  const progressValue = analysisProgress?.progress || 0;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-8 text-sm text-muted-foreground">
        <Link to="/products" className="hover:text-foreground transition-colors">
          Products
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">{productName}</span>
      </div>

      <Button variant="ghost" asChild className="mb-4">
        <Link to="/products">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Link>
      </Button>
      
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold">{productName} Features</h1>
          {featuresCount === 0 ? (
            <p className="text-muted-foreground mt-2">
              No features yet. Create your first feature using the "Add Feature" button.
            </p>
          ) : (
            <p className="text-muted-foreground mt-2">
              Showing {featuresCount} feature{featuresCount === 1 ? '' : 's'}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            {repository && (
              <HoverCard>
                <HoverCardTrigger asChild>
                  <Button onClick={onAnalyze} disabled={showProgress}>
                    <Wand2 className="mr-2 h-4 w-4" />
                    {showProgress ? 'Analysis in Progress' : 'Analyze Repository'}
                  </Button>
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Repository Analysis</h4>
                    <p className="text-sm text-muted-foreground">
                      Analyzes your codebase to detect features, patterns, and potential improvements.
                    </p>
                  </div>
                </HoverCardContent>
              </HoverCard>
            )}
            <Link to={`/products/${productId}/docs`}>
              <Button variant="outline">
                <Book className="mr-2 h-4 w-4" />
                View Documentation
              </Button>
            </Link>
            <CreateFeatureDialog
              productId={productId}
              userId={userId}
              onFeatureCreated={onFeatureCreated}
            />
          </div>
          
          {showProgress && (
            <div className="w-full space-y-2 bg-secondary/50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">
                  Analysis Progress
                </span>
                <span className="text-sm text-muted-foreground">
                  {progressValue}%
                </span>
              </div>
              <Progress value={progressValue} className="w-full" />
              {analysisProgress?.steps && analysisProgress.steps.length > 0 && (
                <div className="mt-4 space-y-1 max-h-32 overflow-y-auto">
                  {analysisProgress.steps.map((step, index) => (
                    <div key={index} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{step.step}</span>
                      <span className="text-muted-foreground">{formatTimestamp(step.timestamp)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
