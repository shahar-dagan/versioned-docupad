
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
import { useEffect, useState } from "react";

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

  useEffect(() => {
    if (isAnalyzing || processAnalysisMutation.isLoading) {
      setShowProgress(true);
    }
  }, [isAnalyzing, processAnalysisMutation.isLoading]);

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
      <AnalysisProgressDialog
        open={showProgress}
        onOpenChange={setShowProgress}
        progress={processAnalysisMutation.isLoading ? (analysisProgress?.progress || 0) : 0}
        steps={analysisProgress?.steps || []}
      />
    </div>
  );
}
