
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, CheckCircle2, XCircle } from "lucide-react";

interface AnalysisProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  progress: number;
  steps: { step: string; timestamp: string }[] | undefined;
}

export function AnalysisProgressDialog({
  open,
  onOpenChange,
  progress,
  steps,
}: AnalysisProgressDialogProps) {
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Find if we're resuming from a previous analysis
  const resumeStep = steps?.find(step => {
    const stepText = step.step.toLowerCase();
    return stepText.includes("resuming analysis") && stepText.includes("files already analyzed");
  });

  // Extract the numbers from the resume message
  const matches = resumeStep?.step.match(/(\d+)\s+files already analyzed.*?(\d+)\s+files/i);

  const analyzedFiles = matches ? parseInt(matches[1]) : 0;
  const totalFiles = matches ? parseInt(matches[2]) : 0;
  const initialProgress = totalFiles > 0 ? Math.round((analyzedFiles / totalFiles) * 100) : 0;

  // Calculate remaining progress as a percentage of the remaining work
  const remainingWork = progress * ((totalFiles - analyzedFiles) / totalFiles);
  const totalProgress = resumeStep 
    ? Math.min(100, initialProgress + remainingWork)
    : progress;

  // Check if analysis is still in progress
  const isAnalysisInProgress = steps && steps.length > 0 && 
    !steps[steps.length - 1].step.toLowerCase().includes('completed') &&
    !steps[steps.length - 1].step.toLowerCase().includes('finished') &&
    !steps[steps.length - 1].step.toLowerCase().includes('error') &&
    progress < 100;

  // Handle dialog state changes
  const handleOpenChange = (newOpen: boolean) => {
    // Allow closing if:
    // 1. Analysis is complete (progress is 100)
    // 2. There's an error
    // 3. No analysis is in progress
    if (!isAnalysisInProgress) {
      onOpenChange(newOpen);
    } else {
      // Only prevent closing during active analysis
      onOpenChange(true);
    }
  };

  // Get status icon based on step text
  const getStepIcon = (step: string) => {
    const lowerStep = step.toLowerCase();
    if (lowerStep.includes('error')) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    if (lowerStep.includes('completed') || lowerStep.includes('finished')) {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
    return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
  };

  // Calculate the step percentage based on total steps
  const getStepPercentage = (index: number) => {
    if (!steps) return 0;
    return Math.round((index + 1) / steps.length * 100);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="sm:max-w-[500px]" 
        onPointerDownOutside={(e) => {
          if (isAnalysisInProgress) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (isAnalysisInProgress) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Repository Analysis Progress</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{Math.round(totalProgress)}%</span>
            </div>
            {resumeStep ? (
              <div className="relative">
                <Progress value={totalProgress} className="h-2" />
                <div 
                  className="absolute top-3 text-xs text-muted-foreground"
                  style={{ 
                    left: `${initialProgress}%`,
                    transform: 'translateX(-50%)'
                  }}
                >
                  ↑ Resumed from here ({initialProgress}%)
                </div>
              </div>
            ) : (
              <Progress value={progress} className="h-2" />
            )}
          </div>

          {steps && steps.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Analysis Logs</h4>
              <ScrollArea className="h-[200px] rounded-md border p-4">
                <div className="space-y-2">
                  {steps.map((step, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between gap-2 text-sm ${
                        step.step.includes("Resuming") 
                          ? "text-blue-600 dark:text-blue-400 font-medium"
                          : step.step.toLowerCase().includes('error')
                          ? "text-red-600 dark:text-red-400 font-medium"
                          : "text-muted-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {getStepIcon(step.step)}
                        <span>{step.step}</span>
                        <span className="text-xs text-muted-foreground">({getStepPercentage(index)}%)</span>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTimestamp(step.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
