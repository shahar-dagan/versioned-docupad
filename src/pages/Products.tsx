
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
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
import { toast } from 'sonner';
import { ProductCard } from '@/components/dashboard/ProductCard';
import { useRepositoryLink } from '@/components/dashboard/useRepositoryLink';
import { useAuth } from '@/components/auth/AuthProvider';
import { ImportDocumentation } from '@/components/dashboard/ImportDocumentation';

interface Product {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export default function Products() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const linkRepoMutation = useRepositoryLink();
  const { user } = useAuth();

  const { data: products, refetch, isLoading, isError, error } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      console.log('Fetching products for user:', user?.id);
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          github_repositories (
            repository_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching products:', error);
        throw error;
      }
      
      console.log('Products fetched successfully:', data);
      return data as (Product & { github_repositories: { repository_name: string } | null })[];
    },
    enabled: !!user, // Only fetch if user is logged in
    retry: 1, // Only retry once
  });

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in to create a product');
      return;
    }

    try {
      console.log('Creating product:', { name, description, author_id: user.id });
      const { error } = await supabase.from('products').insert([
        {
          name,
          description,
          author_id: user.id,
        },
      ]);

      if (error) throw error;

      toast.success('Product created successfully');
      setOpen(false);
      setName('');
      setDescription('');
      refetch();
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error('Failed to create product');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      console.log('Deleting product:', productId);
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      toast.success('Product deleted successfully');
      await refetch();
    } catch (error) {
      console.error('Failed to delete product:', error);
      toast.error('Failed to delete product');
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Please Log In</h2>
          <p className="text-muted-foreground">You need to be logged in to view and manage products.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold">Products</h1>
          <p className="text-muted-foreground mt-2">
            Manage your products and their features
          </p>
        </div>
        <div className="flex gap-2">
          <ImportDocumentation
            productId={products?.[0]?.id}
            onImportComplete={refetch}
          />
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
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading products...</p>
        </div>
      ) : isError ? (
        <div className="text-center py-8">
          <p className="text-red-500">
            {error instanceof Error ? error.message : 'Error loading products. Please try again later.'}
          </p>
        </div>
      ) : products && products.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onLinkRepo={async (productId, repo) => {
                await linkRepoMutation.mutateAsync({ productId, repo });
                refetch();
              }}
              onDelete={async () => {
                await handleDeleteProduct(product.id);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No products found. Create your first product to get started!</p>
        </div>
      )}
    </div>
  );
}
