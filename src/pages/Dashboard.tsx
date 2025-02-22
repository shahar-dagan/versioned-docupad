
import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { toast } from "sonner";
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
        totalProducts: 0,
        totalFeatures: features?.[0]?.count || 0,
        totalTeamMembers: teamMembers?.length || 0,
      } as DashboardStats;
    },
    enabled: !!teamMembers,
  });

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back! Here's an overview of your features and team.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ProfileMenu />
        </div>
      </div>

      <DashboardStats
        productCount={0}
        featureCount={stats?.totalFeatures || 0}
        teamMemberCount={stats?.totalTeamMembers || 0}
      />
    </div>
  );
}
