
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Book, Code, FileText, GitBranch } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Feature {
  id: string;
  name: string;
  description: string;
  technical_docs?: any;
  user_docs?: any;
  code_changes?: Array<{
    change_description: string;
    file_path: string;
    change_type: string;
    created_at: string;
  }>;
}

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
      return data as Feature;
    },
  });

  const generateDocumentation = async () => {
    setIsGenerating(true);
    try {
      // Analyze code changes to understand feature context
      const codeChanges = feature?.code_changes || [];
      const changePatterns = analyzeCodeChanges(codeChanges);

      // Generate user-focused documentation
      const userDocs = {
        overview: generateOverview(feature, changePatterns),
        steps: generateSteps(changePatterns),
        use_cases: generateUseCases(changePatterns),
        faq: generateFAQ(changePatterns),
      };

      // Update the feature with new documentation
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

  // Analyze code changes to identify patterns and user flows
  const analyzeCodeChanges = (changes: Feature['code_changes']) => {
    const patterns = {
      userInputs: new Set<string>(),
      userActions: new Set<string>(),
      dataOperations: new Set<string>(),
      uiComponents: new Set<string>(),
    };

    changes?.forEach((change) => {
      // Identify UI components being modified
      if (change.file_path.includes('components')) {
        patterns.uiComponents.add(change.file_path.split('/').pop() || '');
      }

      // Identify user actions from change descriptions
      if (change.change_description.toLowerCase().includes('user can')) {
        patterns.userActions.add(change.change_description);
      }

      // Identify data operations
      if (change.change_description.toLowerCase().includes('data')) {
        patterns.dataOperations.add(change.change_description);
      }
    });

    return patterns;
  };

  // Generate user-friendly overview based on feature and changes
  const generateOverview = (feature: Feature | undefined, patterns: any) => {
    if (!feature) return '';
    
    return `${feature.name} allows you to ${feature.description.toLowerCase()}. ` +
           `This feature helps you ${Array.from(patterns.userActions).join(', ')}.`;
  };

  // Generate step-by-step instructions based on user actions
  const generateSteps = (patterns: any) => {
    const steps: string[] = [];
    patterns.userActions.forEach((action: string) => {
      steps.push(action.replace('User can', 'You can'));
    });
    return steps;
  };

  // Generate use cases based on identified patterns
  const generateUseCases = (patterns: any) => {
    const useCases: string[] = [];
    patterns.userActions.forEach((action: string) => {
      useCases.push(`Use this feature when you need to ${action.toLowerCase()}`);
    });
    return useCases;
  };

  // Generate FAQ based on common patterns and potential issues
  const generateFAQ = (patterns: any) => {
    const faq: Array<{ question: string; answer: string }> = [];
    
    // Add general usage questions
    faq.push({
      question: "How do I get started with this feature?",
      answer: "Start by reviewing the step-by-step guide above and make sure you're logged in to your account.",
    });

    // Add data-related questions if applicable
    if (patterns.dataOperations.size > 0) {
      faq.push({
        question: "Is my data saved automatically?",
        answer: "Yes, all changes are automatically saved and synchronized with your account.",
      });
    }

    return faq;
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
            onClick={generateDocumentation} 
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
