
import { useParams } from 'react-router-dom';
import { FeaturesList } from '@/components/features/FeaturesList';
import { FeaturesHeader } from '@/components/features/FeaturesHeader';
import { useAuth } from '@/hooks/useAuth';
import { useProduct } from '@/hooks/useProduct';
import { useRepository } from '@/hooks/useRepository';
import { useFeatures } from '@/hooks/useFeatures';
import { toast } from 'sonner';

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

  const handleAnalyze = async () => {
    try {
      await analyzeRepositoryMutation.mutateAsync();
      toast.success('Repository analysis started successfully');
    } catch (error) {
      toast.error('Failed to start repository analysis');
      console.error('Analysis error:', error);
    }
  };

  const handleProcessAnalysis = async () => {
    try {
      await processAnalysisMutation.mutateAsync();
      toast.success('Analysis processing completed');
      refetch();
    } catch (error) {
      toast.error('Failed to process analysis');
      console.error('Processing error:', error);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <FeaturesHeader
        productName={product?.name || 'Loading...'}
        productId={productId || ''}
        userId={authData.user.id}
        featuresCount={features?.length || 0}
        repository={repository}
        onAnalyze={handleAnalyze}
        isAnalyzing={analyzeRepositoryMutation.isPending}
        onFeatureCreated={refetch}
        features={features || []}
        analysisProgress={analysisProgress}
        processAnalysisMutation={{
          mutate: handleProcessAnalysis,
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
