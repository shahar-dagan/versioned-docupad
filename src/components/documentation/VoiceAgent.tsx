
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

interface ClientAction {
  type: 'navigate' | 'click' | 'input' | 'explain';
  target?: string;
  value?: string;
  explanation: string;
}

export function VoiceAgent() {
  const [isOpen, setIsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const navigate = useNavigate();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const base64Audio = await blobToBase64(audioBlob);
        handleVoiceCommand(base64Audio);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        variant: "destructive",
        title: "Microphone Error",
        description: "Unable to access microphone. Please check your permissions.",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result.split(',')[1]);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const executeActions = async (actions: ClientAction[]) => {
    for (const action of actions) {
      switch (action.type) {
        case 'navigate':
          if (action.target) {
            navigate(action.target);
          }
          break;
        case 'click':
          if (action.target) {
            const element = document.querySelector(action.target) as HTMLElement;
            if (element) {
              element.click();
            }
          }
          break;
        case 'input':
          if (action.target && action.value) {
            const element = document.querySelector(action.target) as HTMLInputElement;
            if (element) {
              element.value = action.value;
            }
          }
          break;
      }
      // Add a small delay between actions
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const handleVoiceCommand = async (base64Audio: string) => {
    setIsProcessing(true);
    try {
      // First, convert speech to text
      const { data: transcriptionData, error: transcriptionError } = await supabase.functions.invoke('voice-to-text', {
        body: { audio: base64Audio }
      });

      if (transcriptionError) throw transcriptionError;

      // Then, process the command with our voice agent
      const { data: agentResponse, error: agentError } = await supabase.functions.invoke('voice-agent', {
        body: {
          userMessage: transcriptionData.text,
          currentRoute: window.location.pathname,
          availableActions: {
            routes: ['/dashboard', '/products', '/docs'],
            buttons: ['create-product', 'add-feature', 'view-docs'],
            inputs: ['search-input', 'product-name']
          }
        }
      });

      if (agentError) throw agentError;

      // Play the agent's voice response
      const audio = new Audio(`data:audio/mpeg;base64,${agentResponse.audio}`);
      await audio.play();

      // Execute the actions
      await executeActions(agentResponse.actions);

    } catch (error) {
      console.error('Voice agent error:', error);
      toast({
        variant: "destructive",
        title: "Voice Agent Error",
        description: "Failed to process voice command. Please try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    return () => {
      if (mediaRecorder) {
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [mediaRecorder]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="gap-2"
      >
        <Mic className="h-4 w-4" />
        Voice Assistant
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Voice Assistant</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-6 space-y-4">
          <Button
            size="lg"
            variant={isRecording ? "destructive" : "default"}
            className="rounded-full w-16 h-16 p-4"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : isRecording ? (
              <MicOff className="h-8 w-8" />
            ) : (
              <Mic className="h-8 w-8" />
            )}
          </Button>
          <p className="text-sm text-muted-foreground">
            {isProcessing ? "Processing..." : isRecording ? "Listening..." : "Click to start"}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
