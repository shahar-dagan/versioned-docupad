import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import { DocumentationHeader } from '@/components/documentation/DocumentationHeader';
import { DocumentationSearch } from '@/components/documentation/DocumentationSearch';
import { DocumentationNav } from '@/components/documentation/DocumentationNav';
import { DocumentationContent } from '@/components/documentation/DocumentationContent';
import { MobileNav } from '@/components/documentation/MobileNav';
import { DocumentationGenerator } from '@/components/documentation/DocumentationGenerator';
import { DocsChat } from '@/components/documentation/DocsChat';
import { VoiceAgent } from '@/components/documentation/VoiceAgent';

interface DocumentationSuggestion {
  type: 'technical' | 'user';
  category: string;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
}

interface Feature {
  id: string;
  name: string;
  description: string;
  status: string;
  technical_docs?: {
    architecture?: string;
    setup?: string;
    api_details?: string;
    code_snippets?: Array<{
      language: string;
      code: string;
      description: string;
    }>;
    dependencies?: string[];
  };
  user_docs?: {
    overview?: string;
    steps?: string[];
    use_cases?: string[];
    visuals?: Array<{
      type: 'screenshot' | 'video';
      url: string;
      caption: string;
    }>;
    faq?: Array<{ question: string; answer: string }>;
  };
  suggestions?: DocumentationSuggestion[];
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
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });

  const filteredFeatures = features?.filter(feature =>
    feature.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    feature.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedFeatureData = features?.find(f => f.id === selectedFeature) || features?.[0];

  const getDocumentationText = () => {
    if (!selectedFeatureData) return '';
    const sections = [];
    if (selectedFeatureData.technical_docs) {
      if (selectedFeatureData.technical_docs.architecture) sections.push(selectedFeatureData.technical_docs.architecture);
      if (selectedFeatureData.technical_docs.setup) sections.push(selectedFeatureData.technical_docs.setup);
      if (selectedFeatureData.technical_docs.api_details) sections.push(selectedFeatureData.technical_docs.api_details);
    }
    if (selectedFeatureData.user_docs) {
      if (selectedFeatureData.user_docs.overview) sections.push(selectedFeatureData.user_docs.overview);
      if (selectedFeatureData.user_docs.steps) sections.push(selectedFeatureData.user_docs.steps.join('. '));
      if (selectedFeatureData.user_docs.use_cases) sections.push(selectedFeatureData.user_docs.use_cases.join('. '));
      if (selectedFeatureData.user_docs.faq) {
        sections.push(selectedFeatureData.user_docs.faq.map(item => `Q: ${item.question}\nA: ${item.answer}`).join('\n'));
      }
    }
    return sections.join('\n\n');
  };

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

        <main className="overflow-y-auto pb-16">
          <div className="max-w-3xl mx-auto px-6 py-10">
            <div className="flex justify-end gap-2 mb-6">
              <VoiceAgent />
              <DocsChat documentationText={getDocumentationText()} />
            </div>
            {selectedFeature && (
              <div className="mb-8">
                <DocumentationGenerator featureId={selectedFeature} />
              </div>
            )}
            <DocumentationContent feature={selectedFeatureData} />
          </div>
        </main>
      </div>
    </div>
  );
}
