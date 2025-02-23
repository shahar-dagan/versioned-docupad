
import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface AnimationStep {
  element: string;
  action: 'highlight' | 'click' | 'focus';
  duration: number;
}

export function DashboardVoiceGuide() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleStartListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        
        reader.onload = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          
          try {
            const { data: { text }, error } = await supabase.functions.invoke('voice-to-text', {
              body: { audio: base64Audio }
            });

            if (error) throw error;

            // Process the text and generate response
            await handleQuestion(text);
          } catch (error) {
            console.error('Error processing audio:', error);
            toast({
              title: "Error",
              description: "Failed to process audio. Please try again.",
              variant: "destructive"
            });
          }
        };

        reader.readAsDataURL(audioBlob);
      };

      setIsListening(true);
      mediaRecorder.start();

      // Record for 5 seconds
      setTimeout(() => {
        mediaRecorder.stop();
        stream.getTracks().forEach(track => track.stop());
        setIsListening(false);
      }, 5000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: "Error",
        description: "Could not access microphone. Please check your permissions.",
        variant: "destructive"
      });
    }
  };

  const handleQuestion = async (question: string) => {
    try {
      // Get AI response
      const { data: { text: response, animations } } = await supabase.functions.invoke('process-question', {
        body: { question }
      });

      // Convert text to speech
      const { data: { audioContent }, error: speechError } = await supabase.functions.invoke('text-to-speech', {
        body: { 
          text: response,
          voice: "alloy" // Using a default voice
        }
      });

      if (speechError) throw speechError;

      // Play audio response
      const audio = new Audio(`data:audio/mp3;base64,${audioContent}`);
      audioRef.current = audio;
      
      setIsSpeaking(true);
      await playAudioWithAnimations(audio, animations);
      setIsSpeaking(false);

    } catch (error) {
      console.error('Error processing question:', error);
      toast({
        title: "Error",
        description: "Failed to process your question. Please try again.",
        variant: "destructive"
      });
    }
  };

  const playAudioWithAnimations = async (audio: HTMLAudioElement, animations: AnimationStep[]) => {
    return new Promise<void>((resolve) => {
      let currentIndex = 0;

      const processNextAnimation = () => {
        if (currentIndex < animations.length) {
          const { element, action, duration } = animations[currentIndex];
          const targetElement = document.querySelector(element);

          if (targetElement) {
            targetElement.classList.add(`animate-${action}`);
            setTimeout(() => {
              targetElement.classList.remove(`animate-${action}`);
              currentIndex++;
              processNextAnimation();
            }, duration);
          }
        }
      };

      audio.onplay = () => {
        processNextAnimation();
      };

      audio.onended = () => {
        resolve();
      };

      audio.play();
    });
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Volume2 className="h-5 w-5" />
          {isSpeaking && (
            <div className="absolute -top-1 -right-1 h-3 w-3">
              <div className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
              <div className="relative inline-flex h-3 w-3 rounded-full bg-sky-500" />
            </div>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Voice Assistant</SheetTitle>
          <SheetDescription>
            Ask me anything about using the dashboard. I can help guide you through various tasks.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-8 space-y-4">
          <Button
            variant={isListening ? "destructive" : "default"}
            onClick={handleStartListening}
            disabled={isSpeaking}
            className="w-full"
          >
            {isListening ? (
              <>
                <MicOff className="mr-2 h-5 w-5" />
                Listening...
              </>
            ) : (
              <>
                <Mic className="mr-2 h-5 w-5" />
                Start Speaking
              </>
            )}
          </Button>
          {isListening && (
            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-primary animate-[recording_5s_linear]" />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
