
import { useParams } from 'react-router-dom';
import { FeaturesList } from '@/components/features/FeaturesList';
import { FeaturesHeader } from '@/components/features/FeaturesHeader';
import { useAuth } from '@/hooks/useAuth';
import { useProduct } from '@/hooks/useProduct';
import { useRepository } from '@/hooks/useRepository';
import { useFeatures } from '@/hooks/useFeatures';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { FeatureMap } from '@/components/features/FeatureMap';
import { List, Network } from 'lucide-react';

export default function Features() {
  const { productId } = useParams<{ productId: string }>();
  const { authData } = useAuth();
  const { product, isLoadingProduct } = useProduct(productId, !!authData);
  const { repository } = useRepository(productId, !!authData);
  const {
    features,
    isLoadingFeatures,
    featuresError,
    refetch,
    analyzeRepositoryMutation,
    processAnalysisMutation,
    analysisProgress,
    isLoadingAnalysis,
  } = useFeatures(productId, !!authData && !!productId, repository);

  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Check if we're in the DocuPad admin environment
  const isDocuPadAdmin = window.location.hostname === 'app.docupad.com' || 
                        window.location.hostname === 'localhost' ||
                        window.location.hostname === '127.0.0.1';

  console.log('Features component render:', { features, isLoadingFeatures, featuresError });

  if (!authData) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-500">
            Please log in to view features
          </div>
        </div>
      </div>
    );
  }

  if (isLoadingProduct || isLoadingFeatures) {
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
    <div className="container mx-auto py-10">
      <FeaturesHeader
        productName={product?.name || 'Loading...'}
        productId={productId || ''}
        userId={authData.user.id}
        featuresCount={features?.length || 0}
        repository={repository}
        onAnalyze={() => analyzeRepositoryMutation.mutate()}
        isAnalyzing={analyzeRepositoryMutation.isPending}
        onFeatureCreated={refetch}
        analysisProgress={analysisProgress}
        processAnalysisMutation={{
          mutate: () => {
            console.log('Processing analysis...');
            processAnalysisMutation.mutate(undefined, {
              onSuccess: () => {
                console.log('Processing succeeded, refetching...');
                refetch();
              }
            });
          },
          isLoading: processAnalysisMutation.isPending
        }}
      />

      {isDocuPadAdmin && (
        <div className="flex justify-end mb-6 gap-2">
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            onClick={() => setViewMode('list')}
            className="gap-2"
          >
            <List className="h-4 w-4" />
            List View
          </Button>
          <Button
            variant={viewMode === 'map' ? 'default' : 'outline'}
            onClick={() => setViewMode('map')}
            className="gap-2"
          >
            <Network className="h-4 w-4" />
            Relationship Map
          </Button>
        </div>
      )}

      {viewMode === 'map' && isDocuPadAdmin ? (
        <div className="border rounded-lg shadow-lg bg-white">
          <div className="h-[600px]">
            <FeatureMap features={features || []} onUpdate={refetch} />
          </div>
        </div>
      ) : (
        <FeaturesList
          features={features || []}
          productId={productId || ''}
        />
      )}
    </div>
  );
}
