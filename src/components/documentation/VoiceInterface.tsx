
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Play, Square, Volume2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';

interface VoiceInterfaceProps {
  text: string;
  voiceId?: string;
}

export function VoiceInterface({ text, voiceId = "EXAVITQu4vr4xnSDxMaL" }: VoiceInterfaceProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleTextToSpeech = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text, voiceId }
      });

      if (error || !data?.audio) {
        throw new Error(error?.message || 'Failed to convert text to speech');
      }

      // Clean up previous audio if it exists
      if (audio) {
        audio.pause();
        URL.revokeObjectURL(audio.src);
      }

      // Convert the base64 audio data to a Blob
      const audioData = Uint8Array.from(atob(data.audio), c => c.charCodeAt(0));
      const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const newAudio = new Audio(audioUrl);
      
      newAudio.onended = () => {
        setIsPlaying(false);
      };

      newAudio.onerror = (e) => {
        console.error('Audio playback error:', e);
        toast({
          variant: "destructive",
          title: "Playback Failed",
          description: "Failed to play the audio. Please try again.",
        });
        setIsPlaying(false);
      };

      setAudio(newAudio);
      await newAudio.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('Text to speech error:', error);
      toast({
        variant: "destructive",
        title: "Text to Speech Failed",
        description: error instanceof Error ? error.message : "Failed to convert text to speech. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayPause = () => {
    if (!audio) {
      handleTextToSpeech();
    } else if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  const handleStop = () => {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      setIsPlaying(false);
    }
  };

  return (
    <div className="flex items-center gap-2 mt-4">
      <Button
        variant="outline"
        size="icon"
        onClick={handlePlayPause}
        className="h-8 w-8"
        disabled={isLoading}
      >
        {isPlaying ? (
          <Square className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={handleStop}
        disabled={!audio || isLoading}
        className="h-8 w-8"
      >
        <Square className="h-4 w-4" />
      </Button>
    </div>
  );
}
