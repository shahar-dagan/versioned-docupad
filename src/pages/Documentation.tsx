
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronRight, Book, Search, Menu } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface Feature {
  id: string;
  name: string;
  description: string;
  status: string;
  suggestions?: string[];
}

interface Product {
  id: string;
  name: string;
  description: string;
}

export default function Documentation() {
  const { productId } = useParams<{ productId: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

  const { data: product } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) throw error;
      return data as Product;
    },
  });

  const { data: features } = useQuery({
    queryKey: ['features', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('features')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Feature[];
    },
  });

  const filteredFeatures = features?.filter(feature =>
    feature.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    feature.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedFeatureData = features?.find(f => f.id === selectedFeature) || features?.[0];

  return (
    <div className="min-h-screen bg-[#FCFCFD]">
      {/* Mobile Navigation */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b">
        <Link to={`/products/${productId}/features`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] p-0">
            <SheetHeader className="p-6 border-b">
              <SheetTitle>Documentation</SheetTitle>
            </SheetHeader>
            <div className="px-4 py-3">
              <Input
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <nav className="px-2">
              {filteredFeatures?.map((feature) => (
                <button
                  key={feature.id}
                  onClick={() => setSelectedFeature(feature.id)}
                  className={cn(
                    "w-full text-left px-4 py-2 rounded-md mb-1 hover:bg-slate-100",
                    selectedFeature === feature.id && "bg-slate-100 font-medium"
                  )}
                >
                  {feature.name}
                </button>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      <div className="lg:grid lg:grid-cols-[300px_1fr] h-screen">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex flex-col border-r bg-white h-screen">
          <div className="p-6 border-b">
            <Link to={`/products/${productId}/features`} className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Features
            </Link>
            <div className="flex items-center gap-2 text-sm">
              <Link to="/products" className="hover:text-foreground transition-colors">
                Products
              </Link>
              <ChevronRight className="h-4 w-4" />
              <span className="font-medium text-foreground">{product?.name || 'Loading...'}</span>
            </div>
          </div>
          <div className="p-4 border-b">
            <Input
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          <nav className="flex-1 overflow-y-auto p-4">
            {filteredFeatures?.map((feature) => (
              <button
                key={feature.id}
                onClick={() => setSelectedFeature(feature.id)}
                className={cn(
                  "w-full text-left px-4 py-2 rounded-md mb-1 hover:bg-slate-100",
                  selectedFeature === feature.id && "bg-slate-100 font-medium"
                )}
              >
                {feature.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <main className="overflow-y-auto pb-16">
          <div className="max-w-3xl mx-auto px-6 py-10">
            {selectedFeatureData ? (
              <div className="prose prose-slate max-w-none">
                <h1 className="text-4xl font-bold mb-6">{selectedFeatureData.name}</h1>
                <p className="text-lg text-muted-foreground mb-8">
                  {selectedFeatureData.description}
                </p>
                
                {selectedFeatureData.suggestions && selectedFeatureData.suggestions.length > 0 && (
                  <>
                    <h2 className="text-2xl font-semibold mt-12 mb-4">Implementation Guidelines</h2>
                    <ul className="space-y-3">
                      {selectedFeatureData.suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <div className="mt-1 flex-shrink-0">
                            <div className="h-2 w-2 rounded-full bg-primary" />
                          </div>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                <div className="mt-12 p-6 border rounded-lg bg-slate-50">
                  <div className="flex items-center gap-2 text-sm font-medium mb-2">
                    <Book className="h-4 w-4" />
                    Quick Tips
                  </div>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li>• Review the implementation guidelines for best practices</li>
                    <li>• Test the feature thoroughly before deployment</li>
                    <li>• Consider edge cases in your implementation</li>
                    <li>• Document any dependencies or requirements</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                Select a feature from the sidebar to view its documentation
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
