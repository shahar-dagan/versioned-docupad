
import { useParams } from 'react-router-dom';
import { FeaturesList } from '@/components/features/FeaturesList';
import { FeaturesHeader } from '@/components/features/FeaturesHeader';
import { useAuth } from '@/hooks/useAuth';
import { useProduct } from '@/hooks/useProduct';
import { useRepository } from '@/hooks/useRepository';
import { useFeatures } from '@/hooks/useFeatures';

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
      <FeaturesList
        features={features || []}
        productId={productId || ''}
      />
    </div>
  );
}
