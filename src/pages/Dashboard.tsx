
import { useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { ProfileMenu } from '@/components/dashboard/ProfileMenu';
import { RecentProducts } from '@/components/dashboard/RecentProducts';
import { ProcessTimeline } from '@/components/dashboard/ProcessTimeline';
import { useDashboardData } from '@/hooks/useDashboardData';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

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

  const { products, stats, refetchProducts } = useDashboardData();

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
        productCount={stats?.totalProducts || 0}
        featureCount={stats?.totalFeatures || 0}
        teamMemberCount={stats?.totalTeamMembers || 0}
      />
      
      <div className="grid gap-8 mt-8">
        <ProcessTimeline />
        <RecentProducts 
          products={products || []} 
          onProductDeleted={refetchProducts} 
        />
      </div>
    </div>
  );
}
