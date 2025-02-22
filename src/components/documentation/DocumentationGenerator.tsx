
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Book, Code, FileText, GitBranch } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { ExtendedFeature } from './types';
import { identifyFeatureContext, analyzeCodeChanges } from './utils/featureAnalysis';
import { generateDocumentation } from './utils/documentationGenerator';

export function DocumentationGenerator({ featureId }: { featureId: string }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: feature, refetch } = useQuery({
    queryKey: ['feature', featureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('features')
        .select(`
          *,
          code_changes (
            change_description,
            file_path,
            change_type,
            created_at
          )
        `)
        .eq('id', featureId)
        .single();

      if (error) throw error;
      return data as ExtendedFeature;
    },
  });

  const handleGenerateDocumentation = async () => {
    setIsGenerating(true);
    try {
      if (!feature) throw new Error('Feature not found');
      
      const featureContext = identifyFeatureContext(feature);
      const patterns = analyzeCodeChanges(feature.code_changes);
      const userDocs = generateDocumentation(feature, featureContext, patterns);

      const { error } = await supabase
        .from('features')
        .update({
          user_docs: userDocs,
          last_analyzed_at: new Date().toISOString(),
        })
        .eq('id', featureId);

      if (error) throw error;

      toast.success('Documentation generated successfully');
      refetch();
    } catch (error) {
      console.error('Error generating documentation:', error);
      toast.error('Failed to generate documentation');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!feature) {
    return (
      <Alert>
        <AlertDescription>
          Feature not found. Please make sure you have the correct feature ID.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Book className="h-5 w-5" />
          Documentation Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h3 className="text-sm font-medium mb-1">Current Documentation Status</h3>
            <p className="text-sm text-muted-foreground">
              {feature.last_analyzed_at 
                ? `Last updated ${new Date(feature.last_analyzed_at).toLocaleDateString()}`
                : 'No documentation generated yet'}
            </p>
          </div>
          <Button 
            onClick={handleGenerateDocumentation} 
            disabled={isGenerating}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            {isGenerating ? 'Generating...' : 'Generate Documentation'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Code className="h-4 w-4" />
              Code Changes Analyzed
            </div>
            <p className="text-sm text-muted-foreground">
              {feature.code_changes?.length || 0} changes detected
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <GitBranch className="h-4 w-4" />
              Documentation Sections
            </div>
            <p className="text-sm text-muted-foreground">
              Overview, Steps, Use Cases, and FAQ
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
