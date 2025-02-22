
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Repository } from '@/types';

export function useRepository(productId: string | undefined, enabled: boolean) {
  const { data: repository } = useQuery({
    queryKey: ['repository', productId],
    queryFn: async () => {
      console.log('Fetching repository for product:', productId);
      const { data, error } = await supabase
        .from('github_repositories')
        .select('*')
        .eq('product_id', productId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching repository:', error);
        throw error;
      }
      console.log('Repository data:', data);
      return data as Repository;
    },
    enabled,
  });

  return { repository };
}
