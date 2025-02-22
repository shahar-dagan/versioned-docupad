
import { Link } from 'react-router-dom';
import { Github, Check, ArrowRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { GitHubRepoSelector } from './GitHubRepoSelector';

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

export function ProductCard({ product, onLinkRepo, onDelete }: ProductCardProps) {
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
        <div className="space-y-2">
          {product.github_repositories ? (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <Check className="h-4 w-4 text-green-500" />
                <span>Linked to: {product.github_repositories.repository_name}</span>
              </div>
              <Button variant="outline" className="w-full" asChild>
                <Link to={`/products/${product.id}/features`}>
                  View Features
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
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
