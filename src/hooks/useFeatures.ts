
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { Feature, Repository } from '@/types';

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
            file_path,
            change_type,
            content,
            created_at,
            user_workflows,
            visual_elements,
            navigation_patterns,
            error_handling,
            user_preferences
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
          userId: user.id,
          analysisConfig: {
            userActionAnalysis: true,
            visualInterfaceAnalysis: true,
            navigationAnalysis: true,
            errorHandlingAnalysis: true,
            userPreferencesAnalysis: true,
            analysisPrompt: `
              Analyze this code from a user-centric perspective, focusing on:
              
              1. User Actions & Workflows
              - Identify specific actions users can take
              - Map out supported multi-step processes
              - Determine user problems being solved
              
              2. Visual Interface & Information
              - Key information displayed to users
              - Available input methods
              - User feedback mechanisms
              
              3. User Navigation
              - Navigation patterns and flows
              - Content organization
              - Navigation aids and shortcuts
              
              4. Error Handling & Support
              - User assistance during errors
              - Loading state handling
              - Success confirmations
              
              5. User Preferences & State
              - Customization options
              - Persistent user settings
              - State-dependent UI changes
              
              Describe all features from the user's perspective.
            `
          }
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to analyze repository');
      }

      console.log('Analysis response:', response.data);
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
    onSuccess: (data) => {
      console.log('Analysis completed successfully:', data);
      toast({
        title: "Analysis Complete",
        description: "Repository analysis completed with enhanced user feature detection.",
      });
      queryClient.invalidateQueries({ queryKey: ['features', productId] });
    },
  });

  return {
    features,
    isLoadingFeatures,
    featuresError,
    refetch,
    analyzeRepository: analyzeRepositoryMutation.mutate,
    isAnalyzing: analyzeRepositoryMutation.isPending,
  };
}
