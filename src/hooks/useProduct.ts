
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface Product {
  id: string;
  name: string;
  description: string;
}

export function useProduct(productId: string | undefined, enabled: boolean) {
  const { data: product, isLoading: isLoadingProduct } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      console.log('Fetching product with ID:', productId);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) {
        console.error('Error fetching product:', error);
        throw error;
      }
      console.log('Product data:', data);
      return data as Product;
    },
    enabled,
  });

  return { product, isLoadingProduct };
}
