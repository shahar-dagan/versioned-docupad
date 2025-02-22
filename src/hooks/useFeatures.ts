
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Feature, Repository } from '@/types';

export function useFeatures(productId: string | undefined, enabled: boolean, repository?: Repository) {
  const { data: features, isLoading: isLoadingFeatures, error: featuresError, refetch } = useQuery({
    queryKey: ['features', productId],
    queryFn: async () => {
      console.log('Fetching features for product:', productId);
      const { data, error } = await supabase
        .from('features')
        .select(`
          *,
          code_changes (
            change_description,
            created_at
          )
        `)
        .eq('product_id', productId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching features:', error);
        throw error;
      }
      console.log('Features data:', data);
      return data as Feature[];
    },
    enabled,
  });

  const analyzeRepositoryMutation = useMutation({
    mutationFn: async () => {
      if (!repository?.repository_name) {
        throw new Error('No repository linked to this product');
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('You must be logged in to analyze repositories');
      }

      const response = await supabase.functions.invoke('analyze-repository', {
        body: {
          repoFullName: repository.repository_name,
          productId,
          userId: user.id
        },
      });

      if (response.error) {
        console.error('Analysis error:', response.error);
        throw new Error(response.error.message || 'Failed to analyze repository');
      }

      return response.data;
    },
    onError: (error: Error) => {
      console.error('Analysis mutation error:', error);
      toast.error(`Analysis failed: ${error.message}`);
    },
    onSuccess: () => {
      toast.success('Repository analysis complete');
      refetch();
    },
  });

  const analyzeCodeMutation = useMutation({
    mutationFn: async () => {
      if (!repository?.repository_name) {
        throw new Error('No repository linked to this product');
      }

      const response = await supabase.functions.invoke('analyze-code', {
        body: {
          repository: repository.repository_name,
          productId,
        },
      });

      if (response.error) {
        console.error('DeepSource analysis error:', response.error);
        throw new Error(response.error.message || 'Failed to analyze code with DeepSource');
      }

      return response.data;
    },
    onError: (error: Error) => {
      console.error('DeepSource analysis error:', error);
      toast.error(`DeepSource analysis failed: ${error.message}`);
    },
    onSuccess: () => {
      toast.success('DeepSource analysis complete');
      refetch();
    },
  });

  return {
    features,
    isLoadingFeatures,
    featuresError,
    refetch,
    analyzeRepositoryMutation,
    analyzeCodeMutation,
  };
}
