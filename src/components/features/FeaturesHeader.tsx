
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Book, ChevronRight, Wand2 } from 'lucide-react';
import { Repository } from '@/types';
import { CreateFeatureDialog } from './CreateFeatureDialog';

interface FeaturesHeaderProps {
  productName: string;
  productId: string;
  userId: string;
  featuresCount: number;
  repository?: Repository;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  onFeatureCreated: () => void;
}

export function FeaturesHeader({
  productName,
  productId,
  userId,
  featuresCount,
  repository,
  onAnalyze,
  isAnalyzing,
  onFeatureCreated,
}: FeaturesHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-8 text-sm text-muted-foreground">
        <Link to="/products" className="hover:text-foreground transition-colors">
          Products
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">{productName}</span>
      </div>

      <Button variant="ghost" asChild className="mb-4">
        <Link to="/products">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Link>
      </Button>
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold">{productName} Features</h1>
          {featuresCount === 0 ? (
            <p className="text-muted-foreground mt-2">
              No features yet. Create your first feature using the "Add Feature" button.
            </p>
          ) : (
            <p className="text-muted-foreground mt-2">
              Showing {featuresCount} feature{featuresCount === 1 ? '' : 's'}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {repository && (
            <Button onClick={onAnalyze} disabled={isAnalyzing}>
              <Wand2 className="mr-2 h-4 w-4" />
              {isAnalyzing ? 'Analyzing...' : 'Analyze Repository'}
            </Button>
          )}
          <Link to={`/products/${productId}/docs`}>
            <Button variant="outline">
              <Book className="mr-2 h-4 w-4" />
              View Documentation
            </Button>
          </Link>
          <CreateFeatureDialog
            productId={productId}
            userId={userId}
            onFeatureCreated={onFeatureCreated}
          />
        </div>
      </div>
    </div>
  );
}
