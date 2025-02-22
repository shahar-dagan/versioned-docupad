
import { Link } from 'react-router-dom';
import { Github } from 'lucide-react';
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
} from "@/components/ui/dialog";
import { GitHubRepoSelector } from './GitHubRepoSelector';

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

interface ProductCardProps {
  product: Product;
  onLinkRepo: (productId: string, repo: Repository) => void;
}

export function ProductCard({ product, onLinkRepo }: ProductCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle>{product.name}</CardTitle>
        <CardDescription>
          Created on {new Date(product.created_at).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">{product.description}</p>
        <div className="flex flex-col space-y-2">
          <Button variant="outline" className="w-full" asChild>
            <Link to={`/products/${product.id}/features`}>
              View Features
            </Link>
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
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
              <div className="py-4">
                <GitHubRepoSelector 
                  onSelect={(repo) => onLinkRepo(product.id, repo)}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
