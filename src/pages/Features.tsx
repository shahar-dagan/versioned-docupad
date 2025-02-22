import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus, ArrowLeft, ChevronRight, Wand2, Book } from 'lucide-react';
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
import { toast } from 'sonner';

interface Feature {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  created_at: string;
  last_analyzed_at: string | null;
  suggestions?: string[];
}

interface Product {
  id: string;
  name: string;
  description: string;
}

interface Repository {
  id: string;
  repository_name: string;
  product_id: string;
}

export default function Features() {
  const { productId } = useParams<{ productId: string }>();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const { data: authData } = useQuery({
    queryKey: ['auth-session'],
    queryFn: async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Auth error:', error);
        throw error;
      }
      return session;
    },
  });

  const { data: product, isLoading: isLoadingProduct } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      console.log('Fetching product with ID:', productId);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) {
        console.error('Error fetching product:', error);
        throw error;
      }
      console.log('Product data:', data);
      return data as Product;
    },
    enabled: !!authData,
  });

  const { data: repository } = useQuery({
    queryKey: ['repository', productId],
    queryFn: async () => {
      console.log('Fetching repository for product:', productId);
      const { data, error } = await supabase
        .from('github_repositories')
        .select('*')
        .eq('product_id', productId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching repository:', error);
        throw error;
      }
      console.log('Repository data:', data);
      return data as Repository;
    },
    enabled: !!authData,
  });

  const { data: features, isLoading: isLoadingFeatures, error: featuresError, refetch } = useQuery({
    queryKey: ['features', productId],
    queryFn: async () => {
      console.log('Fetching features for product:', productId);
      const { data, error } = await supabase
        .from('features')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching features:', error);
        throw error;
      }
      console.log('Features data:', data);
      return data as Feature[];
    },
    enabled: !!authData && !!productId,
  });

  const analyzeRepositoryMutation = useMutation({
    mutationFn: async () => {
      if (!repository?.repository_name) {
        throw new Error('No repository linked to this product');
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('You must be logged in to analyze repositories');
      }

      const response = await supabase.functions.invoke('analyze-repository', {
        body: {
          repoFullName: repository.repository_name,
          productId,
          userId: user.id
        },
      });

      if (response.error) {
        console.error('Analysis error:', response.error);
        throw new Error(response.error.message || 'Failed to analyze repository');
      }

      return response.data;
    },
    onError: (error: Error) => {
      console.error('Analysis mutation error:', error);
      toast.error(`Analysis failed: ${error.message}`);
    },
    onSuccess: () => {
      toast.success('Repository analysis complete');
      refetch();
    },
  });

  const handleCreateFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!authData?.user) {
      toast.error('You must be logged in to create a feature');
      return;
    }

    try {
      console.log('Creating feature:', { name, description, productId });
      const { error } = await supabase.from('features').insert([
        {
          name,
          description,
          product_id: productId,
          author_id: authData.user.id,
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
      refetch();
    } catch (error) {
      console.error('Error creating feature:', error);
      toast.error('Failed to create feature');
    }
  };

  if (!authData) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-500">
            Please log in to view features
          </div>
        </div>
      </div>
    );
  }

  if (isLoadingProduct || isLoadingFeatures) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (featuresError) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-500">
            Error loading features. Please try again later.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center gap-2 mb-8 text-sm text-muted-foreground">
        <Link to="/products" className="hover:text-foreground transition-colors">
          Products
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">{product?.name || 'Loading...'}</span>
      </div>

      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/products">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Products
          </Link>
        </Button>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">{product?.name} Features</h1>
            <p className="text-muted-foreground mt-2">
              Manage features and track their development progress
            </p>
          </div>
          <div className="flex gap-2">
            {repository && (
              <Button 
                onClick={() => analyzeRepositoryMutation.mutate()}
                disabled={analyzeRepositoryMutation.isPending}
              >
                <Wand2 className="mr-2 h-4 w-4" />
                {analyzeRepositoryMutation.isPending ? 'Analyzing...' : 'Analyze Repository'}
              </Button>
            )}
            <Link to={`/products/${productId}/docs`}>
              <Button variant="outline">
                <Book className="mr-2 h-4 w-4" />
                View Documentation
              </Button>
            </Link>
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
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features?.map((feature) => (
          <Card key={feature.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>{feature.name}</CardTitle>
              <CardDescription>
                Created on {new Date(feature.created_at).toLocaleDateString()}
                {feature.last_analyzed_at && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Documentation updated: {new Date(feature.last_analyzed_at).toLocaleString()}
                  </div>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{feature.description}</p>
              {feature.suggestions && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Suggestions:</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    {feature.suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex items-center justify-between mt-4">
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800">
                  {feature.status || 'Active'}
                </span>
                <Button variant="outline" asChild>
                  <Link to={`/products/${productId}/features/${feature.id}/changes`}>
                    View Changes
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
