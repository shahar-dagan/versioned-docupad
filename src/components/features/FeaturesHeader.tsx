
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Repository } from "@/types";
import { AnalysisProgressDialog } from "./AnalysisProgressDialog";
import { CreateFeatureDialog } from "./CreateFeatureDialog";
import { Plus, RefreshCw, FileText, Book } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Link, useNavigate } from "react-router-dom";

interface FeaturesHeaderProps {
  productName: string;
  productId: string;
  userId: string;
  featuresCount: number;
  repository: Repository | null;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  onFeatureCreated: () => void;
  analysisProgress: any;
  processAnalysisMutation: {
    mutate: () => void;
    isLoading: boolean;
  };
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
  processAnalysisMutation,
}: FeaturesHeaderProps) {
  const [showProgress, setShowProgress] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [hasDocumentation, setHasDocumentation] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if any features have documentation
    const checkDocumentation = async () => {
      const { data: features } = await supabase
        .from('features')
        .select('user_docs')
        .eq('product_id', productId)
        .not('user_docs', 'is', null);
      
      setHasDocumentation(features && features.length > 0);
    };

    checkDocumentation();
  }, [productId]);

  useEffect(() => {
    if (isAnalyzing || processAnalysisMutation.isLoading) {
      setShowProgress(true);
    }
  }, [isAnalyzing, processAnalysisMutation.isLoading]);

  const handleGenerateDocumentation = async () => {
    setIsGenerating(true);
    setGenProgress(0);
    setCurrentStep('Initializing documentation generation...');

    try {
      // Step 1: Get all features
      setGenProgress(20);
      setCurrentStep('Fetching features...');
      const { data: features, error: fetchError } = await supabase
        .from('features')
        .select('*')
        .eq('product_id', productId);

      if (fetchError) throw fetchError;

      // Step 2: Generate documentation for each feature
      setGenProgress(40);
      setCurrentStep('Generating documentation...');
      
      for (const feature of features || []) {
        const { error: updateError } = await supabase
          .from('features')
          .update({
            user_docs: {
              overview: `Generated overview for ${feature.name}`,
              steps: [`Step 1 for ${feature.name}`, `Step 2 for ${feature.name}`],
              use_cases: [`Use case 1 for ${feature.name}`],
              faq: [{ question: `FAQ 1 for ${feature.name}?`, answer: 'Answer 1' }]
            },
            last_analyzed_at: new Date().toISOString(),
          })
          .eq('id', feature.id);

        if (updateError) throw updateError;
      }

      setGenProgress(100);
      setCurrentStep('Documentation generated successfully');
      setHasDocumentation(true);
      toast.success('Documentation generated for all features');
    } catch (error) {
      console.error('Error generating documentation:', error);
      toast.error('Failed to generate documentation');
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
        setGenProgress(0);
        setCurrentStep('');
      }, 1500);
    }
  };

  return (
    <div className="flex flex-col gap-6 mb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Features for {productName}
          </h1>
          <p className="text-muted-foreground mt-2">
            {featuresCount} feature{featuresCount !== 1 ? "s" : ""} discovered
          </p>
        </div>
        <div className="flex gap-2">
          {repository && (
            <>
              {hasDocumentation ? (
                <Button 
                  variant="outline"
                  onClick={() => navigate(`/products/${productId}/docs`)}
                >
                  <Book className="h-4 w-4 mr-2" />
                  View Documentation
                </Button>
              ) : (
                <Button 
                  variant="outline"
                  onClick={handleGenerateDocumentation}
                  disabled={isGenerating}
                >
                  <FileText className={`h-4 w-4 mr-2`} />
                  {isGenerating ? 'Generating...' : 'Generate Documentation'}
                </Button>
              )}
              <Button 
                variant="outline"
                onClick={() => processAnalysisMutation.mutate()}
                disabled={processAnalysisMutation.isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${processAnalysisMutation.isLoading ? 'animate-spin' : ''}`} />
                Process Analysis
              </Button>
              <Button 
                variant="outline"
                onClick={onAnalyze}
                disabled={isAnalyzing}
              >
                Analyze Repository
              </Button>
            </>
          )}
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Feature
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a new feature</DialogTitle>
              </DialogHeader>
              <CreateFeatureDialog
                productId={productId}
                userId={userId}
                onFeatureCreated={onFeatureCreated}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isGenerating && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{currentStep}</span>
            <span>{genProgress}%</span>
          </div>
          <Progress value={genProgress} className="h-2" />
        </div>
      )}

      <AnalysisProgressDialog
        open={showProgress}
        onOpenChange={setShowProgress}
        progress={processAnalysisMutation.isLoading ? (analysisProgress?.progress || 0) : 0}
        steps={analysisProgress?.steps || []}
      />
    </div>
  );
}
