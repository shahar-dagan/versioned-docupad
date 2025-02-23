
import { useParams } from 'react-router-dom';
import { useFeatures } from '@/hooks/useFeatures';
import { useAuth } from '@/hooks/useAuth';
import { FeatureMap } from '@/components/features/FeatureMap';
import { Feature } from '@/types';

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

  // Group features by their directory path
  const groupFeaturesByPath = (features: Feature[]) => {
    const groups = new Map<string, Feature[]>();
    
    features.forEach(feature => {
      const location = feature.technical_docs?.location || '';
      const directory = location.split('/').slice(0, -1).join('/') || 'root';
      
      if (!groups.has(directory)) {
        groups.set(directory, []);
      }
      groups.get(directory)?.push(feature);
    });
    
    return groups;
  };

  const featureGroups = groupFeaturesByPath(features || []);

  return (
    <div className="h-screen w-screen">
      <FeatureMap 
        features={features || []} 
        featureGroups={featureGroups}
        onUpdate={() => window.location.reload()}
      />
    </div>
  );
}
