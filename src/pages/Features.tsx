
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { FeaturesList } from '@/components/features/FeaturesList';
import { FeaturesHeader } from '@/components/features/FeaturesHeader';
import { toast } from 'sonner';

interface Feature {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  created_at: string;
  last_analyzed_at: string | null;
  suggestions?: string[];
}

interface Product {
  id: string;
  name: string;
  description: string;
}

interface Repository {
  id: string;
  repository_name: string;
  product_id: string;
}

export default function Features() {
  const { productId } = useParams<{ productId: string }>();

  const { data: authData } = useQuery({
    queryKey: ['auth-session'],
    queryFn: async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Auth error:', error);
        throw error;
      }
      console.log('Auth session:', session);
      return session;
    },
  });

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
    enabled: !!authData,
  });

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
    enabled: !!authData,
  });

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
    enabled: !!authData && !!productId,
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

  if (!authData) {
    console.log('No auth data available');
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
    console.log('Loading state:', { isLoadingProduct, isLoadingFeatures });
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (featuresError) {
    console.error('Features error:', featuresError);
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
      />
      <FeaturesList
        features={features || []}
        productId={productId || ''}
      />
    </div>
  );
}
