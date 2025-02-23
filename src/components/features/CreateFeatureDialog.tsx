
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Mic, MicOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CreateFeatureDialogProps {
  productId: string;
  userId: string;
  onFeatureCreated: () => void;
}

export function CreateFeatureDialog({ productId, userId, onFeatureCreated }: CreateFeatureDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await handleVoiceInput(audioBlob);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Unable to access microphone. Please check your permissions.');
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

  const handleVoiceInput = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(',')[1];
        if (!base64Audio) throw new Error('Failed to convert audio to base64');

        const { data, error } = await supabase.functions.invoke('transcribe-audio', {
          body: { audio: base64Audio }
        });

        if (error) throw error;

        setDescription((prev) => prev ? `${prev}\n${data.text}` : data.text);
        toast.success('Voice input transcribed successfully');
      };
    } catch (error) {
      console.error('Transcription error:', error);
      toast.error('Failed to transcribe voice input');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // First check if the product exists
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id')
        .eq('id', productId)
        .single();

      if (productError || !product) {
        throw new Error('Product not found. Please make sure the product exists.');
      }

      console.log('Creating feature:', { name, description, productId });
      const { error } = await supabase.from('features').insert([
        {
          name,
          description,
          product_id: productId,
          author_id: userId,
          status: 'active',
        },
      ]);

      if (error) {
        console.error('Error creating feature:', error);
        throw error;
      }

      toast.success('Feature created successfully');
      setOpen(false);
      setName('');
      setDescription('');
      onFeatureCreated();
    } catch (error) {
      console.error('Error creating feature:', error);
      toast.error(error.message || 'Failed to create feature');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Feature
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Feature</DialogTitle>
          <DialogDescription>
            Add a new feature to track its development and documentation
          </DialogDescription>
        </DialogHeader>
        {productId ? (
          <form onSubmit={handleCreateFeature} className="space-y-4">
            <div>
              <Input
                placeholder="Feature Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Textarea
                placeholder="Feature Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                disabled={isSubmitting}
                className="min-h-[100px]"
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant={isRecording ? "destructive" : "secondary"}
                  size="sm"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isRecording ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                  <span className="ml-2">
                    {isProcessing ? "Processing..." : isRecording ? "Stop" : "Voice Input"}
                  </span>
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Feature'}
            </Button>
          </form>
        ) : (
          <Alert>
            <AlertDescription>
              Cannot create feature: Product not found. Please ensure you are on a valid product page.
            </AlertDescription>
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  );
}
