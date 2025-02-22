
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import { DocumentationHeader } from '@/components/documentation/DocumentationHeader';
import { DocumentationSearch } from '@/components/documentation/DocumentationSearch';
import { DocumentationNav } from '@/components/documentation/DocumentationNav';
import { DocumentationContent } from '@/components/documentation/DocumentationContent';
import { MobileNav } from '@/components/documentation/MobileNav';

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
    staleTime: 30000, // Consider data fresh for 30 seconds
    cacheTime: 5 * 60 * 1000, // Keep unused data in cache for 5 minutes
  });

  const filteredFeatures = features?.filter(feature =>
    feature.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    feature.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedFeatureData = features?.find(f => f.id === selectedFeature) || features?.[0];

  return (
    <div className="min-h-screen bg-[#FCFCFD]">
      <MobileNav
        productId={productId!}
        features={filteredFeatures}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedFeature={selectedFeature}
        onFeatureSelect={setSelectedFeature}
      />

      <div className="lg:grid lg:grid-cols-[300px_1fr] h-screen">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex flex-col border-r bg-white h-screen">
          <DocumentationHeader 
            productId={productId!}
            productName={product?.name}
          />
          <DocumentationSearch
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
          <DocumentationNav
            features={filteredFeatures}
            selectedFeature={selectedFeature}
            onFeatureSelect={setSelectedFeature}
          />
        </div>

        {/* Main Content */}
        <main className="overflow-y-auto pb-16">
          <div className="max-w-3xl mx-auto px-6 py-10">
            <DocumentationContent feature={selectedFeatureData} />
          </div>
        </main>
      </div>
    </div>
  );
}
