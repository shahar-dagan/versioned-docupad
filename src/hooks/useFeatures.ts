import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { Feature, Repository } from '@/types';

interface AnalysisProgress {
  id: string;
  progress: number | null;
  status: string;
  steps: { step: string; timestamp: string }[];
  analysis_results: {
    steps: { step: string; timestamp: string }[];
  } | null;
}

interface FileAnalysis {
  file_path: string;
  feature_summaries: {
    features: {
      name: string;
      description: string;
      confidence: number;
      location: string;
      type: string;
      dependencies: string[];
    }[];
  };
}

export function useFeatures(productId: string | undefined, enabled: boolean, repository?: Repository) {
  const queryClient = useQueryClient();
  
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
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching features:', error);
        throw error;
      }
      console.log('Features data:', data);
      return data as Feature[];
    },
    enabled,
    staleTime: 0,
    gcTime: 0,
  });

  const { data: lastAnalysis, error: lastAnalysisError } = useQuery({
    queryKey: ['last-analysis', productId],
    queryFn: async () => {
      console.log('Fetching last analysis for product:', productId);
      const { data, error } = await supabase
        .from('feature_analysis_results')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching last analysis:', error);
        throw error;
      }
      console.log('Last analysis data:', data);
      return data;
    },
    enabled: enabled && !!productId,
  });

  const { data: analysisProgress, isLoading: isLoadingAnalysis, refetch: refetchAnalysis } = useQuery({
    queryKey: ['analysis-progress', productId],
    queryFn: async () => {
      console.log('Fetching analysis progress for product:', productId);
      const { data: analysisData, error: analysisError } = await supabase
        .from('codeql_analyses')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (analysisError) {
        console.error('Error fetching analysis progress:', analysisError);
        throw analysisError;
      }

      if (analysisData) {
        console.log('Analysis data:', analysisData);
        const isCompleted = analysisData.status === 'completed' || 
                          analysisData.status === 'failed' ||
                          analysisData.status === 'error';

        if (isCompleted && analysisData.status === 'completed') {
          console.log('Analysis completed, triggering features refetch');
          refetch();
        }

        if (!isCompleted) {
          console.log('Analysis still in progress, status:', analysisData.status);
        }

        if (isCompleted) {
          const { data: fileAnalyses, error: fileAnalysesError } = await supabase
            .from('file_analyses')
            .select('*')
            .eq('product_id', productId)
            .eq('repository_name', repository?.repository_name);

          if (fileAnalysesError) {
            console.error('Error fetching file analyses:', fileAnalysesError);
          }

          console.log('Analysis completed, file analyses:', fileAnalyses);
          return {
            ...analysisData,
            fileAnalyses,
            lastAnalysis: lastAnalysis
          };
        }

        return {
          ...analysisData,
          lastAnalysis: lastAnalysis
        };
      }

      return {
        ...analysisData,
        lastAnalysis: lastAnalysis
      };
    },
    enabled: enabled && !!productId,
    refetchInterval: (query) => {
      const data = query.state.data as AnalysisProgress;
      if (!data || !data.status) return 1000;
      
      if (data.status === 'completed' || data.status === 'failed' || data.status === 'error') {
        return false;
      }
      
      return 5000;
    },
    staleTime: 0,
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

      const { data: analysis, error: analysisError } = await supabase
        .from('codeql_analyses')
        .insert({
          product_id: productId,
          repository_name: repository.repository_name,
          status: 'pending',
          triggered_by: user.id,
          progress: 0,
          steps: []
        })
        .select()
        .single();

      if (analysisError) {
        console.error('Error creating analysis:', analysisError);
        throw analysisError;
      }

      const { error: updateError } = await supabase
        .from('codeql_analyses')
        .update({ status: 'running' })
        .eq('id', analysis.id);

      if (updateError) {
        console.error('Error updating analysis status:', updateError);
        throw updateError;
      }

      const response = await supabase.functions.invoke('analyze-repository', {
        body: {
          repoFullName: repository.repository_name,
          productId,
          userId: user.id,
          analysisId: analysis.id
        },
      });

      if (response.error) {
        await supabase
          .from('codeql_analyses')
          .update({ status: 'error' })
          .eq('id', analysis.id);
        
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

  const processAnalysisMutation = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('You must be logged in to process analysis');
      }

      console.log('Starting analysis processing...');

      const response = await supabase.functions.invoke('process-analysis', {
        body: { 
          productId,
          userId: user.id
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to process analysis');
      }

      return response.data;
    },
    onMutate: () => {
      console.log('Analysis processing started...');
    },
    onError: (error: Error) => {
      console.error('Process analysis error:', error);
      toast({
        variant: "destructive",
        title: "Processing Failed",
        description: error.message,
      });
    },
    onSuccess: async (data) => {
      console.log('Processing succeeded:', data);
      
      // Invalidate all relevant queries
      await queryClient.invalidateQueries({ queryKey: ['features', productId] });
      await queryClient.invalidateQueries({ queryKey: ['analysis-progress', productId] });
      
      // Force immediate refetch
      await refetch();
      
      toast({
        title: "Analysis Processing Complete",
        description: "Features have been generated from the analysis results.",
      });
    },
  });

  return {
    features,
    isLoadingFeatures,
    featuresError,
    refetch,
    analyzeRepositoryMutation,
    processAnalysisMutation,
    analysisProgress,
    isLoadingAnalysis,
  };
}
