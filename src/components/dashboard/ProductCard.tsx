
import { Link } from 'react-router-dom';
import { Github, Trash2, CheckCircle, Book } from 'lucide-react';
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
  DialogFooter,
} from "@/components/ui/dialog";
import { GitHubRepoSelector } from './GitHubRepoSelector';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Repository } from '@/types';

interface Product {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

interface ProductCardProps {
  product: Product;
  onLinkRepo: (productId: string, repo: Repository) => Promise<void>;
  onDelete?: () => void;
}

export function ProductCard({ product, onLinkRepo, onDelete }: ProductCardProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLinkRepoDialogOpen, setIsLinkRepoDialogOpen] = useState(false);

  const { data: repository } = useQuery({
    queryKey: ['github-repository', product.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('github_repositories')
        .select('*')
        .eq('product_id', product.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    staleTime: 0
  });

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id);

      if (error) throw error;

      toast.success('Product deleted successfully');
      await onDelete?.();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
    setIsDeleteDialogOpen(false);
  };

  const handleLinkRepo = async (repo: Repository) => {
    try {
      await onLinkRepo(product.id, repo);
      setIsLinkRepoDialogOpen(false);
    } catch (error) {
      console.error('Error linking repository:', error);
      toast.error('Failed to link repository');
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CardTitle>{product.name}</CardTitle>
              <Badge variant={repository ? "default" : "secondary"}>
                {repository ? "Active" : "Setup Needed"}
              </Badge>
            </div>
            <CardDescription>
              Created on {new Date(product.created_at).toLocaleDateString()}
            </CardDescription>
          </div>
          {repository && (
            <div 
              className="flex items-center gap-2 text-green-500" 
              title="GitHub repository connected"
            >
              <CheckCircle className="h-5 w-5" />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">{product.description}</p>
        {repository && (
          <div className="mb-4 p-2 bg-muted rounded-md flex items-center gap-2">
            <Github className="h-4 w-4" />
            <span className="text-sm font-medium">{repository.repository_name}</span>
          </div>
        )}
        <div className="flex flex-col space-y-2">
          <Dialog open={isLinkRepoDialogOpen} onOpenChange={setIsLinkRepoDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full"
                disabled={!!repository}
              >
                <Github className="mr-2 h-4 w-4" />
                {repository ? 'Repository Linked' : 'Link GitHub Repo'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Link GitHub Repository</DialogTitle>
                <DialogDescription>
                  Choose a repository to link to {product.name}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <GitHubRepoSelector 
                  onSelect={handleLinkRepo}
                  isLoading={false}
                />
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" className="w-full" asChild>
            <Link to={`/products/${product.id}/features`}>
              View Features
            </Link>
          </Button>
          <Link to={`/products/${product.id}/docs`}>
            <Button variant="outline">
              <Book className="mr-2 h-4 w-4" />
              View Documentation
            </Button>
          </Link>
          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full text-red-600 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Product
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Product</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete {product.name}? This action cannot be undone and all associated features will be deleted.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  Delete Product
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
