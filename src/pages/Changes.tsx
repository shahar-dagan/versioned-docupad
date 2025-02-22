import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, ArrowLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

interface CodeChange {
  id: string;
  file_path: string;
  change_description: string;
  change_type: string;
  created_at: string;
}

interface Feature {
  id: string;
  name: string;
  description: string;
}

export default function Changes() {
  const { productId, featureId } = useParams<{ productId: string; featureId: string }>();
  const [open, setOpen] = useState(false);
  const [filePath, setFilePath] = useState('');
  const [description, setDescription] = useState('');
  const [changeType, setChangeType] = useState('feature');
  const { toast } = useToast();

  const { data: feature } = useQuery({
    queryKey: ['feature', featureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('features')
        .select('*')
        .eq('id', featureId)
        .single();

      if (error) throw error;
      return data as Feature;
    },
  });

  const { data: product } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) throw error;
      return data as { name: string };
    },
  });

  const { data: changes, refetch } = useQuery({
    queryKey: ['changes', featureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('code_changes')
        .select('*')
        .eq('feature_id', featureId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CodeChange[];
    },
  });

  const handleCreateChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to log a code change',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase.from('code_changes').insert([
        {
          file_path: filePath,
          change_description: description,
          change_type: changeType,
          feature_id: featureId,
          author_id: user.id,
        },
      ]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Code change logged successfully',
      });

      setOpen(false);
      setFilePath('');
      setDescription('');
      setChangeType('feature');
      refetch();
    } catch (error) {
      console.error('Error logging code change:', error);
      toast({
        title: 'Error',
        description: 'Failed to log code change',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto py-10">
      {/* Navigation Path */}
      <div className="flex items-center gap-2 mb-8 text-sm text-muted-foreground">
        <Link to="/products" className="hover:text-foreground transition-colors">
          Products
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link 
          to={`/products/${productId}/features`}
          className="hover:text-foreground transition-colors"
        >
          {product?.name || 'Loading...'}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">{feature?.name || 'Loading...'}</span>
      </div>

      {/* Rest of the existing content */}
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link to={`/products/${productId}/features`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Features
          </Link>
        </Button>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">{feature?.name} Changes</h1>
            <p className="text-muted-foreground mt-2">
              Track code changes for this feature
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Log Change
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log Code Change</DialogTitle>
                <DialogDescription>
                  Record a code change related to this feature
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateChange} className="space-y-4">
                <div>
                  <Input
                    placeholder="File Path (e.g., src/components/Button.tsx)"
                    value={filePath}
                    onChange={(e) => setFilePath(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Select value={changeType} onValueChange={setChangeType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Change Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="feature">New Feature</SelectItem>
                      <SelectItem value="bugfix">Bug Fix</SelectItem>
                      <SelectItem value="refactor">Refactor</SelectItem>
                      <SelectItem value="test">Test</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Textarea
                    placeholder="Change Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  Log Change
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {changes?.map((change) => (
          <Card key={change.id}>
            <CardHeader>
              <CardTitle className="text-lg font-medium">{change.file_path}</CardTitle>
              <CardDescription>
                Logged on {new Date(change.created_at).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
                  {change.change_type}
                </span>
                <p className="text-muted-foreground">{change.change_description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
