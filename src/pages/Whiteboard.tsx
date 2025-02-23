
import { useParams } from 'react-router-dom';
import { useFeatures } from '@/hooks/useFeatures';
import { useAuth } from '@/hooks/useAuth';
import { FeatureMap } from '@/components/features/FeatureMap';

export default function Whiteboard() {
  const { productId } = useParams<{ productId: string }>();
  const { authData } = useAuth();
  const { features, isLoadingFeatures, featuresError } = useFeatures(productId, !!authData && !!productId, null);

  if (!authData) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-500">
            Please log in to view the whiteboard
          </div>
        </div>
      </div>
    );
  }

  if (isLoadingFeatures) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (featuresError) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-500">
            Error loading features. Please try again later.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen">
      <FeatureMap 
        features={features || []} 
        onUpdate={() => window.location.reload()}
      />
    </div>
  );
}
