
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
      setGenProgress(20);
      setCurrentStep('Fetching all features...');
      const { data: features, error: fetchError } = await supabase
        .from('features')
        .select('*')
        .eq('product_id', productId);

      if (fetchError) throw fetchError;

      if (!features || features.length === 0) {
        setCurrentStep('No features found');
        toast.error('No features found for this product');
        return;
      }

      const totalFeatures = features.length;
      let processedCount = 0;

      setGenProgress(40);
      setCurrentStep('Regenerating documentation for all features...');
      
      for (const feature of features) {
        const { error: updateError } = await supabase
          .from('features')
          .update({
            user_docs: {
              overview: `${feature.name} is a feature that ${feature.description || 'provides functionality for the application'}`,
              steps: [
                `Navigate to the ${feature.name} section`,
                `Configure the necessary settings`,
                `Use the feature according to your needs`
              ],
              use_cases: [
                `When you need to utilize ${feature.name} functionality`,
                `When integrating ${feature.name} with other features`,
                `For enhancing user experience with ${feature.name}`
              ],
              faq: [
                {
                  question: `What is ${feature.name}?`,
                  answer: feature.description || `${feature.name} is a feature of the application`
                },
                {
                  question: `How do I use ${feature.name}?`,
                  answer: `Follow the steps provided in the documentation to use ${feature.name} effectively`
                }
              ]
            },
            last_analyzed_at: new Date().toISOString(),
          })
          .eq('id', feature.id);

        if (updateError) {
          console.error(`Error updating feature ${feature.name}:`, updateError);
          toast.error(`Failed to generate documentation for ${feature.name}`);
          continue;
        }

        processedCount++;
        const progress = Math.round((processedCount / totalFeatures) * 60) + 40;
        setGenProgress(progress);
        setCurrentStep(`Generated documentation for ${feature.name} (${processedCount}/${totalFeatures})`);
      }

      setGenProgress(100);
      setCurrentStep('Documentation regenerated successfully');
      setHasDocumentation(true);
      toast.success(`Documentation regenerated for all ${totalFeatures} features`);
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
                onClick={() => processAnalysisMutation.mutate()}
                disabled={processAnalysisMutation.isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${processAnalysisMutation.isLoading ? 'animate-spin' : ''}`} />
                List Features
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
