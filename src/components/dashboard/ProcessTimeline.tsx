
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Clock } from "lucide-react";
import { Link } from "react-router-dom";

interface Analysis {
  id: string;
  product_id: string;
  status: string;
  progress: number;
  repository_name: string;
  created_at: string;
  steps: { step: string; timestamp: string }[];
  products: { name: string } | null;
}

export function ProcessTimeline() {
  const { data: analyses } = useQuery({
    queryKey: ['ongoing-analyses'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('codeql_analyses')
          .select(`
            id,
            product_id,
            status,
            progress,
            repository_name,
            created_at,
            steps,
            products (
              name
            )
          `)
          .in('status', ['pending', 'processing'])
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching analyses:', error);
          throw error;
        }

        // Transform the data to match our interface
        const transformedData = data?.map(item => ({
          ...item,
          products: item.products ? Array.isArray(item.products) ? item.products[0] : item.products : null
        }));

        return transformedData as Analysis[];
      } catch (error) {
        console.error('Failed to fetch analyses:', error);
        return [];
      }
    },
    refetchInterval: 1000, // Refetch every second
  });

  if (!analyses || analyses.length === 0) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Ongoing Processes</h2>
      <div className="space-y-4">
        {analyses.map((analysis) => (
          <div key={analysis.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="font-medium">
                  <Link 
                    to={`/products/${analysis.product_id}/features`}
                    className="hover:underline"
                  >
                    {analysis.products?.name || 'Unknown Product'}
                  </Link>
                </h3>
                <p className="text-sm text-muted-foreground">
                  {analysis.repository_name}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  {new Date(analysis.created_at).toLocaleTimeString()}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{analysis.steps?.[analysis.steps.length - 1]?.step || 'Initializing...'}</span>
                <span>{analysis.progress || 0}%</span>
              </div>
              <Progress value={analysis.progress || 0} className="h-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
