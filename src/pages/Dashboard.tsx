import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus, BarChart2, GitBranch, Users, Github } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

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

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  profiles: {
    username: string | null;
    avatar_url: string | null;
  } | null;
}

interface DashboardStats {
  totalProducts: number;
  totalFeatures: number;
  totalTeamMembers: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [newTeamMemberEmail, setNewTeamMemberEmail] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const { data: products } = useQuery({
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
          profiles:profiles!user_id(
            username,
            avatar_url
          )
        `)
        .eq('team_id', teams.id);

      if (error) throw error;
      return (data as TeamMember[]) || [];
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

  const { data: repositories } = useQuery({
    queryKey: ['github-repos'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('github', {
        method: 'GET',
      });
      
      if (error) throw error;
      return data.repos as Repository[];
    },
  });

  const inviteTeamMemberMutation = useMutation({
    mutationFn: async (email: string) => {
      const { data: teams } = await supabase
        .from('teams')
        .select('id')
        .eq('owner_id', user?.id)
        .single();

      if (!teams) throw new Error('No team found');

      const { data: invitedUser, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (userError || !invitedUser) {
        throw new Error('User not found');
      }

      const { error } = await supabase
        .from('team_members')
        .insert({
          team_id: teams.id,
          user_id: invitedUser.id,
          role: 'member',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Team member invited successfully!');
      setNewTeamMemberEmail('');
    },
    onError: (error) => {
      toast.error('Failed to invite team member: ' + error.message);
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
      setSelectedProduct(null);
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
        <Button asChild>
          <Link to="/products">
            <Plus className="mr-2 h-4 w-4" />
            New Product
          </Link>
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalProducts || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Features</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalFeatures || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTeamMembers || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Team Management */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Team Members</h2>
        <Card>
          <CardHeader>
            <CardTitle>Manage Team</CardTitle>
            <CardDescription>
              Add or remove team members to collaborate on your products
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {teamMembers?.map((member) => (
                <div key={member.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {member.profiles?.avatar_url && (
                      <img
                        src={member.profiles.avatar_url}
                        alt={member.profiles.username || 'Team member'}
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <span>{member.profiles?.username || member.user_id}</span>
                    <span className="text-sm text-muted-foreground">{member.role}</span>
                  </div>
                </div>
              ))}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Team Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Team Member</DialogTitle>
                    <DialogDescription>
                      Enter the email address of the user you want to invite
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <Input
                      placeholder="Email address"
                      value={newTeamMemberEmail}
                      onChange={(e) => setNewTeamMemberEmail(e.target.value)}
                    />
                    <Button
                      onClick={() => {
                        if (newTeamMemberEmail) {
                          inviteTeamMemberMutation.mutate(newTeamMemberEmail);
                        }
                      }}
                    >
                      Send Invitation
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Products */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Recent Products</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products?.slice(0, 3).map((product) => (
            <Card key={product.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>{product.name}</CardTitle>
                <CardDescription>
                  Created on {new Date(product.created_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{product.description}</p>
                <div className="flex flex-col space-y-2">
                  <Button variant="outline" className="w-full" asChild>
                    <Link to={`/products/${product.id}/features`}>
                      View Features
                    </Link>
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => setSelectedProduct(product.id)}
                      >
                        <Github className="mr-2 h-4 w-4" />
                        Link GitHub Repo
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Link GitHub Repository</DialogTitle>
                        <DialogDescription>
                          Choose a repository to link to {product.name}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        {repositories?.map((repo) => (
                          <div key={repo.id} className="flex items-center gap-4">
                            <Github className="h-4 w-4" />
                            <span className="flex-grow">{repo.name}</span>
                            <Button
                              onClick={() => {
                                if (selectedProduct) {
                                  linkRepoMutation.mutate({
                                    productId: selectedProduct,
                                    repo,
                                  });
                                }
                              }}
                            >
                              Link
                            </Button>
                          </div>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
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
