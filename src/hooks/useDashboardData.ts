
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthProvider';

interface Product {
  id: string;
  name: string;
  description: string;
  created_at: string;
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

export function useDashboardData() {
  const { user } = useAuth();

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

  return {
    products,
    teamMembers,
    stats,
    refetchProducts,
  };
}
