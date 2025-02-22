import { useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { toast } from "sonner";
import { ProductCard } from '@/components/dashboard/ProductCard';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { ProfileMenu } from '@/components/dashboard/ProfileMenu';

interface Product {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

interface Repository {
  id: string;
  name: string;
  url: string;
}

interface Profile {
  username: string | null;
  avatar_url: string | null;
}

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  profiles: Profile;
}

interface DashboardStats {
  totalProducts: number;
  totalFeatures: number;
  totalTeamMembers: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  // Add cleanup for resize observers
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      // Batch DOM reads and writes
      requestAnimationFrame(() => {
        entries.forEach(() => {
          // Handle resize if needed
        });
      });
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const { data: products, refetch: refetchProducts } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Product[];
    },
  });

  const { data: teamMembers } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const { data: teams } = await supabase
        .from('teams')
        .select('id')
        .eq('owner_id', user?.id)
        .maybeSingle();

      if (!teams) return [];

      const { data, error } = await supabase
        .from('team_members')
        .select(`
          id,
          user_id,
          role,
          profiles!inner (
            username,
            avatar_url
          )
        `)
        .eq('team_id', teams.id);

      if (error) throw error;
      
      return (data as any[]).map(member => ({
        ...member,
        profiles: member.profiles as Profile
      })) as TeamMember[];
    },
    enabled: !!user,
  });

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data: features, error: featuresError } = await supabase
        .from('features')
        .select('count');
      
      if (featuresError) throw featuresError;

      return {
        totalProducts: products?.length || 0,
        totalFeatures: features?.[0]?.count || 0,
        totalTeamMembers: teamMembers?.length || 0,
      } as DashboardStats;
    },
    enabled: !!products && !!teamMembers,
  });

  const linkRepoMutation = useMutation({
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
    },
    onSuccess: () => {
      toast.success('Repository linked successfully!');
      // Invalidate queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['github-repository'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => {
      toast.error('Failed to link repository: ' + error.message);
    },
});

  return (
    <div ref={containerRef} className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back! Here's an overview of your products and features.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button asChild>
            <Link to="/products">
              <Plus className="mr-2 h-4 w-4" />
              New Product
            </Link>
          </Button>
          <ProfileMenu />
        </div>
      </div>

      <DashboardStats
        productCount={products?.length || 0}
        featureCount={stats?.totalFeatures || 0}
        teamMemberCount={stats?.totalTeamMembers || 0}
      />

      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Recent Products</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products?.slice(0, 3).map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onLinkRepo={async (productId, repo) => {
                await linkRepoMutation.mutateAsync({ productId, repo });
              }}
              onDelete={() => {
                refetchProducts();
              }}
            />
          ))}
        </div>
        {products && products.length > 3 && (
          <div className="mt-4 text-center">
            <Button variant="outline" asChild>
              <Link to="/products">View All Products</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
