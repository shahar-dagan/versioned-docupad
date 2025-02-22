
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Repository {
  id: string;
  name: string;
  url: string;
}

export function useRepositoryLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, repo }: { productId: string, repo: Repository }) => {
      const { error } = await supabase
        .from('github_repositories')
        .insert({
          product_id: productId,
          repository_name: repo.name,
          repository_url: repo.url,
          repository_id: repo.id,
        });

      if (error) throw error;
      
      // Return the productId for use in onSuccess
      return { productId };
    },
    onSuccess: ({ productId }) => {
      toast.success('Repository linked successfully!');
      // Invalidate the specific product's repository query
      queryClient.invalidateQueries({ 
        queryKey: ['github-repository', productId],
        exact: true
      });
    },
    onError: (error) => {
      toast.error('Failed to link repository: ' + error.message);
    },
  });
}
