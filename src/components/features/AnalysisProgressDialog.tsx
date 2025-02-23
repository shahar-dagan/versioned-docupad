
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useState } from "react";
import { Clock, X } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";

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
  const [elapsedTime, setElapsedTime] = useState(0);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isAnalysisInProgress = progress < 100 || (steps && steps.length > 0 && 
    !steps[steps.length - 1].step.toLowerCase().includes('completed') &&
    !steps[steps.length - 1].step.toLowerCase().includes('finished') &&
    !steps[steps.length - 1].step.toLowerCase().includes('error'));

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (open && isAnalysisInProgress) {
      console.log('Starting timer...');
      timer = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) {
        clearInterval(timer);
      }
      if (!open) {
        setElapsedTime(0);
      }
    };
  }, [open, isAnalysisInProgress]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!isAnalysisInProgress) {
      onOpenChange(newOpen);
    }
  };

  const getProgressPercentage = () => {
    if (!steps || steps.length === 0) {
      const smoothProgress = Math.min(progress || 0, 100);
      return smoothProgress;
    }
    
    if (!isAnalysisInProgress) return 100;

    const totalSteps = steps.length;
    const currentStep = steps.findIndex(s => 
      s.step.toLowerCase().includes('analyzing') ||
      s.step.toLowerCase().includes('processing')
    );

    if (currentStep === -1) {
      return Math.min(progress || 0, 100);
    }

    const baseProgress = Math.floor((currentStep / totalSteps) * 100);
    const stepProgress = progress ? Math.min(progress % (100 / totalSteps), 100 / totalSteps) : 0;
    return Math.min(baseProgress + stepProgress, 100);
  };

  const getCurrentStatus = () => {
    if (!steps || steps.length === 0) return 'Analyzing repository...';
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
        <DialogHeader className="relative">
          <DialogTitle>Repository Analysis Progress</DialogTitle>
          <div className="absolute right-2 top-2">
            <Tooltip 
              content={isAnalysisInProgress ? "Analysis in progress - please wait" : "Close"}
            >
              <button
                className={`rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none ${
                  isAnalysisInProgress ? 'cursor-not-allowed' : 'cursor-pointer'
                }`}
                onClick={() => !isAnalysisInProgress && onOpenChange(false)}
                disabled={isAnalysisInProgress}
              >
                <X className={`h-4 w-4 ${isAnalysisInProgress ? 'text-gray-400' : 'text-gray-600'}`} />
                <span className="sr-only">
                  {isAnalysisInProgress ? "Cannot close while analysis is in progress" : "Close"}
                </span>
              </button>
            </Tooltip>
          </div>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{getCurrentStatus()}</span>
              <span>{getProgressPercentage()}%</span>
            </div>
            <Progress value={getProgressPercentage()} className="h-2" />
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Analysis Logs</h4>
            <ScrollArea className="h-[200px] rounded-md border p-4">
              <div className="space-y-2">
                {steps && steps.length > 0 ? (
                  steps.map((step, index) => (
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
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Waiting for analysis logs...
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground absolute bottom-6 left-6">
            <Clock className="h-4 w-4" />
            <span>{formatElapsedTime(elapsedTime)}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
