
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Repository, Feature } from "@/types";
import { AnalysisProgressDialog } from "./AnalysisProgressDialog";
import { CreateFeatureDialog } from "./CreateFeatureDialog";
import { Plus, RefreshCw, FileText, Book, Layout } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Link, useNavigate } from "react-router-dom";
import { FeatureMap } from './FeatureMap';

interface FeaturesHeaderProps {
  productName: string;
  productId: string;
  userId: string;
  featuresCount: number;
  repository: Repository | null;
  features: Feature[];
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
  features,
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

  // Automatically show progress dialog when analysis starts
  useEffect(() => {
    if (isAnalyzing || processAnalysisMutation.isLoading) {
      setShowProgress(true);
    }
  }, [isAnalyzing, processAnalysisMutation.isLoading]);

  // Check for documentation
  useEffect(() => {
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

  const handleAnalyzeClick = () => {
    toast.info("Starting repository analysis...");
    setShowProgress(true);
    onAnalyze();
  };

  const handleGenerateDocumentation = async () => {
    setIsGenerating(true);
    setGenProgress(0);
    setCurrentStep("Starting documentation generation...");
    
    try {
      // Start documentation generation
      toast.info("Starting documentation generation...");
      
      // Update progress as documentation is being generated
      setGenProgress(25);
      setCurrentStep("Analyzing features...");
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing
      setGenProgress(50);
      setCurrentStep("Generating documentation structure...");
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing
      setGenProgress(75);
      setCurrentStep("Writing documentation content...");
      
      // Call your documentation generation endpoint
      const { error } = await supabase.functions.invoke('process-documentation', {
        body: { productId }
      });

      if (error) throw error;

      setGenProgress(100);
      setCurrentStep("Documentation generated successfully!");
      toast.success("Documentation generated successfully!");
      
      // Refresh documentation status
      setHasDocumentation(true);
    } catch (error) {
      console.error('Documentation generation error:', error);
      toast.error("Failed to generate documentation");
    } finally {
      setIsGenerating(false);
      setCurrentStep('');
      setGenProgress(0);
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
              <Button 
                variant="outline"
                onClick={() => navigate(`/products/${productId}/features/whiteboard`)}
              >
                <Layout className="h-4 w-4 mr-2" />
                Whiteboard
              </Button>
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
                onClick={() => {
                  toast.info("Processing repository analysis...");
                  processAnalysisMutation.mutate();
                }}
                disabled={processAnalysisMutation.isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${processAnalysisMutation.isLoading ? 'animate-spin' : ''}`} />
                List Features
              </Button>
              <Button 
                variant="outline"
                onClick={handleAnalyzeClick}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Analyze Repository
                  </>
                )}
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
