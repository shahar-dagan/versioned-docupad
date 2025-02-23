
import { Link } from 'react-router-dom';
import { Feature } from '@/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Book } from 'lucide-react';

interface FeaturesListProps {
  features: Feature[];
  productId: string;
}

export function FeaturesList({ features, productId }: FeaturesListProps) {
  if (features.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">No features found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Click the "Add Feature" button to create your first feature
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {features.map((feature) => (
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
              <div className="flex gap-2">
                {feature.user_docs && (
                  <Button variant="outline" asChild>
                    <Link to={`/products/${productId}/docs`}>
                      <Book className="h-4 w-4 mr-2" />
                      View Docs
                    </Link>
                  </Button>
                )}
                <Button variant="outline" asChild>
                  <Link to={`/products/${productId}/features/${feature.id}/changes`}>
                    View Changes
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
