
import { Link } from 'react-router-dom';
import { Github, Check, ArrowRight, Trash2, Code } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { GitHubRepoSelector } from './GitHubRepoSelector';
import { supabase } from '@/lib/supabase';

interface Repository {
  id: string;
  name: string;
  url: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  created_at: string;
  github_repositories: { repository_name: string } | null;
}

interface ProductCardProps {
  product: Product;
  onLinkRepo: (productId: string, repo: Repository) => void;
  onDelete: (productId: string) => void;
}

interface Feature {
  id: string;
  name: string;
  description: string;
  status: string;
}

export function ProductCard({ product, onLinkRepo, onDelete }: ProductCardProps) {
  const { data: features } = useQuery({
    queryKey: ['features', product.id],
    queryFn: async () => {
      if (!product.github_repositories) return [];
      
      // First analyze the repository
      await supabase.functions.invoke('analyze-repository', {
        body: { productId: product.id },
      });

      // Then fetch the features
      const { data, error } = await supabase
        .from('features')
        .select('*')
        .eq('product_id', product.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Feature[];
    },
    enabled: !!product.github_repositories,
  });

  return (
    <Card className="hover:shadow-lg transition-shadow">
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
            onClick={() => onDelete(product.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">{product.description}</p>
        <div className="space-y-4">
          {product.github_repositories ? (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-green-500" />
                <span>Linked to: {product.github_repositories.repository_name}</span>
              </div>
              
              {features && features.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    Detected Features
                  </h4>
                  <ul className="space-y-2">
                    {features.map((feature) => (
                      <li key={feature.id} className="text-sm text-muted-foreground">
                        • {feature.name}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : features ? (
                <p className="text-sm text-muted-foreground">No features detected yet</p>
              ) : (
                <p className="text-sm text-muted-foreground">Analyzing repository...</p>
              )}
            </>
          ) : (
            <GitHubRepoSelector
              onLinkRepo={(repo) => onLinkRepo(product.id, repo)}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
