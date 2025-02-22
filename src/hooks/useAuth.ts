
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useAuth() {
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

  return { authData };
}
