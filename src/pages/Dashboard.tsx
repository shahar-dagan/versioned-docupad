import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus, Github, Check } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { toast } from "sonner";
import { ProductCard } from '@/components/dashboard/ProductCard';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { ProfileMenu } from '@/components/dashboard/ProfileMenu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Product {
  id: string;
  name: string;
  description: string;
  created_at: string;
  github_repositories: { repository_name: string } | null;
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
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const { data: products, refetch: refetchProducts } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          github_repositories (
            repository_name
          )
        `)
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

  const createProductMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('products')
        .insert({
          name,
          description,
          author_id: user?.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Product created successfully!');
      setCreateDialogOpen(false);
      setName('');
      setDescription('');
      refetchProducts();
    },
    onError: (error) => {
      toast.error('Failed to create product: ' + error.message);
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Product deleted successfully!');
      refetchProducts();
    },
    onError: (error) => {
      toast.error('Failed to delete product: ' + error.message);
    },
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
      refetchProducts();
    },
    onError: (error) => {
      toast.error('Failed to link repository: ' + error.message);
    },
  });

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back! Here's an overview of your products and features.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Product
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Product</DialogTitle>
                <DialogDescription>
                  Add a new product to start tracking its features
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Input
                    placeholder="Product Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <Textarea
                    placeholder="Product Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => createProductMutation.mutate()}
                  disabled={!name || createProductMutation.isPending}
                >
                  {createProductMutation.isPending ? 'Creating...' : 'Create Product'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <ProfileMenu />
        </div>
      </div>

      <DashboardStats
        productCount={products?.length || 0}
        featureCount={stats?.totalFeatures || 0}
        teamMemberCount={stats?.totalTeamMembers || 0}
      />

      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Products</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products?.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onLinkRepo={(productId, repo) => {
                linkRepoMutation.mutate({ productId, repo });
              }}
              onDelete={(productId) => {
                deleteProductMutation.mutate(productId);
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
