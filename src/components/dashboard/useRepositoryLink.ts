
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Repository } from '@/types';

export function useRepositoryLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, repo }: { productId: string, repo: Repository }) => {
      const { error } = await supabase
        .from('github_repositories')
        .insert({
          product_id: productId,
          repository_name: repo.repository_name,
          repository_url: repo.repository_url,
          repository_id: repo.repository_id,
        });

      if (error) throw error;
      
      return { productId };
    },
    onSuccess: ({ productId }) => {
      toast.success('Repository linked successfully!');
      queryClient.invalidateQueries({ 
        queryKey: ['github-repository', productId],
        exact: true
      });
      queryClient.invalidateQueries({ 
        queryKey: ['github-repository']
      });
      queryClient.invalidateQueries({ 
        queryKey: ['products']
      });
    },
    onError: (error) => {
      toast.error('Failed to link repository: ' + error.message);
    },
  });
}
