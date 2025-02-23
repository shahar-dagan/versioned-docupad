import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Loader2, Mic, MicOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { VoiceInterface } from './VoiceInterface';
import { PROMPTS } from '@/lib/prompts';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface DocsChatProps {
  documentationText: string;
}

export function DocsChat({ documentationText }: DocsChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = async (e) => {
        chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const base64Audio = await blobToBase64(audioBlob);
        
        handleVoiceInput(base64Audio);
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

  const handleVoiceInput = async (base64Audio: string) => {
    setIsLoading(true);
    try {
      const { data: transcriptionData, error: transcriptionError } = await supabase.functions.invoke('voice-to-text', {
        body: { audio: base64Audio }
      });

      if (transcriptionError) throw transcriptionError;

      const userMessage = transcriptionData.text;
      setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
      
      const response = await fetch('https://api.elevenlabs.io/v1/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVEN_LABS_API_KEY || '',
        },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }],
          context: {
            documentationText,
            systemPrompt: PROMPTS.DOCS_CHAT_CONTEXT
          }
        })
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      const assistantMessage = { role: 'assistant' as const, content: data.response };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Voice chat error:', error);
      toast({
        variant: "destructive",
        title: "Chat Error",
        description: "Failed to process voice input. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('https://api.elevenlabs.io/v1/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVEN_LABS_API_KEY || '',
        },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }],
          context: {
            documentationText,
            systemPrompt: PROMPTS.DOCS_CHAT_CONTEXT
          }
        })
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        variant: "destructive",
        title: "Chat Error",
        description: "Failed to get response. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <MessageCircle className="h-4 w-4" />
          Talk with Docs
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Chat with Documentation</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col h-[500px]">
          <ScrollArea className="flex-1 p-4 border rounded-md mb-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`mb-4 ${
                  message.role === 'assistant'
                    ? 'bg-muted/50 p-3 rounded-lg'
                    : 'bg-primary/5 p-3 rounded-lg'
                }`}
              >
                <p className="text-sm">{message.content}</p>
                {message.role === 'assistant' && (
                  <div className="mt-2">
                    <VoiceInterface text={message.content} />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
          </ScrollArea>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={isRecording ? "destructive" : "secondary"}
              size="icon"
              onClick={isRecording ? stopRecording : startRecording}
            >
              {isRecording ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
            <form onSubmit={handleSubmit} className="flex gap-2 flex-1">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type or use voice input..."
                className="flex-1 px-3 py-2 border rounded-md"
                disabled={isLoading || isRecording}
              />
              <Button type="submit" disabled={isLoading || isRecording}>
                Send
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
