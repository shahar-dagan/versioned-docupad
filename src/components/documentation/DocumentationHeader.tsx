
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DocumentationHeaderProps {
  productId: string;
  productName: string | undefined;
}

export function DocumentationHeader({ productId, productName }: DocumentationHeaderProps) {
  return (
    <div className="p-6 border-b">
      <Link to={`/products/${productId}/features`} className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Features
      </Link>
      <div className="flex items-center gap-2 text-sm">
        <Link to="/products" className="hover:text-foreground transition-colors">
          Products
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">{productName || 'Loading...'}</span>
      </div>
    </div>
  );
}
