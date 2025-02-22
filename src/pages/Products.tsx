import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus, Trash2, Github, Check, Wand2 } from 'lucide-react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Link } from 'react-router-dom';

interface Product {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

interface Repository {
  id: string;
  name: string;
  url: string;
}

export default function Products() {
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: products, refetch } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          github_repositories (
            repository_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as (Product & { github_repositories: { repository_name: string } | null })[];
    },
  });

  const { data: repositories } = useQuery({
    queryKey: ['github-repos'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('github', {
        method: 'GET',
      });
      
      if (error) throw error;
      return data.repos as Repository[];
    },
  });

  const analyzeRepositoryMutation = useMutation({
    mutationFn: async (productId: string) => {
      const response = await supabase.functions.invoke('analyze-repository', {
        body: {
          productId,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Repository analyzed and features generated successfully',
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create a product',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase.from('products').insert([
        {
          name,
          description,
          author_id: user.id,
        },
      ]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Product created successfully',
      });

      setOpen(false);
      setName('');
      setDescription('');
      refetch();
    } catch (error) {
      console.error('Error creating product:', error);
      toast({
        title: 'Error',
        description: 'Failed to create product',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to delete a product',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Product deleted successfully',
      });

      setDeleteOpen(false);
      setDeleteProductId(null);
      refetch();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete product',
        variant: 'destructive',
      });
    }
  };

  const linkRepoMutation = useMutation({
    mutationFn: async ({ productId, repo }: { productId: string, repo: Repository }) => {
      const { error } = await supabase
        .from('github_repositories')
        .insert({
          product_id: productId,
          repository_name: repo.name,
          repository_url: repo.url,
          repository_id: repo.id,
        });

      if (error) throw error;

      await analyzeRepositoryMutation.mutateAsync(productId);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Repository linked successfully and feature analysis started',
      });
      setSelectedProduct(null);
      setLinkDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to link repository: ' + error.message,
        variant: 'destructive',
      });
    },
  });

  const filteredRepositories = repositories?.filter(repo =>
    repo.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold">Products</h1>
          <p className="text-muted-foreground mt-2">
            Manage your products and their features
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Product</DialogTitle>
              <DialogDescription>
                Add a new product to track its features and documentation
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <Input
                  placeholder="Product Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Textarea
                  placeholder="Product Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Create Product
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products?.map((product) => (
          <Card key={product.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{product.name}</CardTitle>
                  <CardDescription>
                    Created on {new Date(product.created_at).toLocaleDateString()}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    setDeleteProductId(product.id);
                    setDeleteOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{product.description}</p>
              {product.github_repositories ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Linked to: {product.github_repositories.repository_name}</span>
                  </div>
                  <Button variant="outline" className="w-full" asChild>
                    <Link to={`/products/${product.id}/features`}>
                      View Features
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => analyzeRepositoryMutation.mutate(product.id)}
                    disabled={analyzeRepositoryMutation.isPending}
                  >
                    <Wand2 className="mr-2 h-4 w-4" />
                    {analyzeRepositoryMutation.isPending ? 'Analyzing...' : 'Regenerate Features'}
                  </Button>
                </div>
              ) : (
                <Dialog open={linkDialogOpen && selectedProduct === product.id} onOpenChange={(open) => {
                  setLinkDialogOpen(open);
                  if (!open) setSelectedProduct(null);
                }}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        setSelectedProduct(product.id);
                        setLinkDialogOpen(true);
                      }}
                    >
                      <Github className="mr-2 h-4 w-4" />
                      Link GitHub Repo
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Link GitHub Repository</DialogTitle>
                      <DialogDescription>
                        Choose a repository to link to {product.name}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Search repositories..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="mb-4"
                      />
                      <div className="grid gap-4 max-h-[300px] overflow-y-auto">
                        {filteredRepositories?.map((repo) => (
                          <div key={repo.id} className="flex items-center gap-4 p-2 hover:bg-accent rounded-md">
                            <Github className="h-4 w-4" />
                            <span className="flex-grow">{repo.name}</span>
                            <Button
                              onClick={() => {
                                if (selectedProduct) {
                                  linkRepoMutation.mutate({
                                    productId: selectedProduct,
                                    repo,
                                  });
                                }
                              }}
                              disabled={linkRepoMutation.isPending}
                            >
                              {linkRepoMutation.isPending ? 'Linking...' : 'Link'}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the product
              and all its associated features and changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteProductId(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteProductId && handleDeleteProduct(deleteProductId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
