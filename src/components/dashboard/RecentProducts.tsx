
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ProductCard } from './ProductCard';
import { useRepositoryLink } from './useRepositoryLink';

interface Product {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

interface RecentProductsProps {
  products: Product[];
  onProductDeleted: () => void;
}

export function RecentProducts({ products, onProductDeleted }: RecentProductsProps) {
  const linkRepoMutation = useRepositoryLink();

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4">Recent Products</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products?.slice(0, 3).map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onLinkRepo={async (productId, repo) => {
              await linkRepoMutation.mutateAsync({ productId, repo });
            }}
            onDelete={onProductDeleted}
          />
        ))}
      </div>
      {products && products.length > 3 && (
        <div className="mt-4 text-center">
          <Button variant="outline" asChild>
            <Link to="/products">View All Products</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
