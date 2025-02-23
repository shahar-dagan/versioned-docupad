
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

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
    console.log('Checking step:', stepText);
    return stepText.includes("resuming analysis") && stepText.includes("files already analyzed");
  });

  console.log('Resume step found:', resumeStep);

  // Extract the numbers from the resume message
  const matches = resumeStep?.step.match(/(\d+)\s+files already analyzed.*?(\d+)\s+files/i);
  console.log('Regex matches:', matches);

  const initialProgress = matches ? Math.round((parseInt(matches[1]) / parseInt(matches[2])) * 100) : 0;
  console.log('Calculated initial progress:', {
    analyzedFiles: matches?.[1],
    totalFiles: matches?.[2],
    initialProgress
  });

  // Calculate the total progress by adding the initial progress to the current progress scaled to the remaining percentage
  const totalProgress = resumeStep 
    ? initialProgress + (progress * (100 - initialProgress) / 100)
    : progress;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
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
                      className={`flex justify-between text-sm ${
                        step.step.includes("Resuming") 
                          ? "text-blue-600 dark:text-blue-400 font-medium"
                          : "text-muted-foreground"
                      }`}
                    >
                      <span>{step.step}</span>
                      <span>{formatTimestamp(step.timestamp)}</span>
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
