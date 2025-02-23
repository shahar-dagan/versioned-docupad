
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
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "../ui/use-toast";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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
  const [showProgress, setShowProgress] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isAnalyzing) {
      setShowProgress(true);
    }
  }, [isAnalyzing]);

  const handleProcessAnalysis = async () => {
    try {
      setIsProcessing(true);
      setShowProgress(true);

      const { error } = await supabase.functions.invoke('process-analysis', {
        body: { productId, userId }
      });

      if (error) throw error;

      toast({
        title: "Analysis Processing Complete",
        description: "Features have been generated from the analysis results.",
      });

      // Refresh the features list
      onFeatureCreated();
    } catch (error) {
      console.error('Error processing analysis:', error);
      toast({
        variant: "destructive",
        title: "Processing Failed",
        description: error instanceof Error ? error.message : "Failed to process analysis results",
      });
    } finally {
      setIsProcessing(false);
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
                onClick={handleProcessAnalysis}
                disabled={isProcessing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
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
      <AnalysisProgressDialog
        open={showProgress}
        onOpenChange={setShowProgress}
        progress={isProcessing ? (analysisProgress?.progress || 0) : 0}
        steps={analysisProgress?.steps || []}
      />
    </div>
  );
}
