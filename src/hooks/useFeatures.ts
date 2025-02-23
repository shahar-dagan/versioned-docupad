
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { Feature, Repository } from '@/types';

interface AnalysisProgress {
  progress: number;
  status: string;
  steps: { step: string; timestamp: string }[];
}

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

  const { data: analysisProgress, isLoading: isLoadingAnalysis } = useQuery({
    queryKey: ['analysis-progress', productId],
    queryFn: async () => {
      console.log('Fetching analysis progress for product:', productId);
      const { data, error } = await supabase
        .from('codeql_analyses')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching analysis progress:', error);
        throw error;
      }
      console.log('Analysis progress:', data);
      return data as AnalysisProgress | null;
    },
    enabled: enabled && !!productId,
    refetchInterval: (data) => {
      // Actively poll while analysis is in progress
      return data?.status === 'in_progress' ? 2000 : false;
    },
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
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: error.message,
      });
    },
    onSuccess: () => {
      toast({
        title: "Analysis Started",
        description: "The repository analysis has begun. You can monitor its progress here.",
      });
      refetch();
    },
  });

  return {
    features,
    isLoadingFeatures,
    featuresError,
    refetch,
    analyzeRepositoryMutation,
    analysisProgress,
    isLoadingAnalysis,
  };
}
