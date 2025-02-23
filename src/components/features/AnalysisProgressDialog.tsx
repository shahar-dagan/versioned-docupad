
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

  // Check if analysis is still in progress
  const isAnalysisInProgress = steps && steps.length > 0 && 
    !steps[steps.length - 1].step.toLowerCase().includes('completed') &&
    !steps[steps.length - 1].step.toLowerCase().includes('finished') &&
    !steps[steps.length - 1].step.toLowerCase().includes('error');

  // Handle dialog state changes
  const handleOpenChange = (newOpen: boolean) => {
    if (!isAnalysisInProgress) {
      onOpenChange(newOpen);
    }
  };

  // Calculate the actual progress percentage
  const getProgressPercentage = () => {
    if (!steps || steps.length === 0) return 0;
    
    // If analysis is complete, return 100%
    if (!isAnalysisInProgress) return 100;

    // Calculate progress based on steps completed
    const totalSteps = steps.length;
    const currentStep = steps.findIndex(s => 
      s.step.toLowerCase().includes('analyzing') ||
      s.step.toLowerCase().includes('processing')
    );

    if (currentStep === -1) return progress || 0;
    return Math.min(Math.round((currentStep / totalSteps) * 100), 100);
  };

  // Get the current status message
  const getCurrentStatus = () => {
    if (!steps || steps.length === 0) return 'Starting analysis...';
    const lastStep = steps[steps.length - 1];
    return lastStep.step;
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
              <span>{getCurrentStatus()}</span>
              <span>{getProgressPercentage()}%</span>
            </div>
            <Progress value={getProgressPercentage()} className="h-2" />
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
                        step.step.toLowerCase().includes('error')
                          ? "text-red-600 dark:text-red-400 font-medium"
                          : step.step.toLowerCase().includes('completed') || step.step.toLowerCase().includes('finished')
                          ? "text-green-600 dark:text-green-400 font-medium"
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
