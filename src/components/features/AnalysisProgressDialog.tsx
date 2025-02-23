
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
  const resumeStep = steps?.find(step => 
    step.step.includes("Resuming analysis") || 
    step.step.includes("files already analyzed")
  );

  // Get the initial progress if resuming
  const initialProgress = resumeStep ? 
    parseInt(resumeStep.step.match(/(\d+)\s+files already analyzed/)?.[1] || "0") : 0;

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
              <span>{progress}%</span>
            </div>
            {resumeStep ? (
              <div className="relative">
                <Progress value={progress} className="h-2" />
                <div 
                  className="absolute top-3 left-0 text-xs text-muted-foreground"
                  style={{ left: `${initialProgress}%` }}
                >
                  ↑ Resumed from here
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
