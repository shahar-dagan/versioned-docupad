
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
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

interface CreateFeatureDialogProps {
  productId: string;
  userId: string;
  onFeatureCreated: () => void;
}

export function CreateFeatureDialog({ productId, userId, onFeatureCreated }: CreateFeatureDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleCreateFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
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
      toast.error('Failed to create feature');
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
        <form onSubmit={handleCreateFeature} className="space-y-4">
          <div>
            <Input
              placeholder="Feature Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <Textarea
              placeholder="Feature Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full">
            Create Feature
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
