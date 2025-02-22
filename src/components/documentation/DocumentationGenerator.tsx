
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Book, Code, FileText, GitBranch } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Feature } from '@/types';

interface ExtendedFeature extends Feature {
  code_changes?: Array<{
    change_description: string;
    file_path: string;
    change_type: string;
    created_at: string;
  }>;
}

interface UserFlow {
  action: string;
  prerequisites?: string[];
  steps: string[];
  expectedOutcome: string;
}

interface FeatureContext {
  mainFeature: string;
  subFeature: string;
  userFlows: UserFlow[];
  relatedFeatures: string[];
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
      return data as ExtendedFeature;
    },
  });

  const identifyFeatureContext = (feature: ExtendedFeature): FeatureContext => {
    // Identify which main feature this belongs to based on file paths and descriptions
    const paths = feature.code_changes?.map(c => c.file_path) || [];
    const descriptions = feature.code_changes?.map(c => c.change_description) || [];
    
    const context: FeatureContext = {
      mainFeature: '',
      subFeature: '',
      userFlows: [],
      relatedFeatures: []
    };

    // Determine main feature category
    if (paths.some(p => p.includes('auth'))) {
      context.mainFeature = 'Authentication';
      context.subFeature = paths.some(p => p.includes('signup')) ? 'Sign Up' : 'Login';
    } else if (paths.some(p => p.includes('documentation'))) {
      context.mainFeature = 'Documentation';
      context.subFeature = paths.some(p => p.includes('generator')) ? 'Documentation Generation' : 'Documentation Viewing';
    } else if (paths.some(p => p.includes('features'))) {
      context.mainFeature = 'Features';
      context.subFeature = 'Feature Management';
    }

    // Identify user flows
    const userFlows: UserFlow[] = [];
    descriptions.forEach(desc => {
      if (!desc) return;
      
      if (desc.toLowerCase().includes('user can')) {
        const flow: UserFlow = {
          action: desc.replace('User can', '').trim(),
          steps: [],
          expectedOutcome: `Successfully ${desc.toLowerCase().replace('user can', '').trim()}`
        };
        
        // Add prerequisites if auth-related
        if (context.mainFeature === 'Authentication') {
          flow.prerequisites = ['Valid email address', 'Password meeting security requirements'];
        }
        
        userFlows.push(flow);
      }
    });

    context.userFlows = userFlows;
    
    // Identify related features
    if (context.mainFeature === 'Authentication') {
      context.relatedFeatures = ['User Profile', 'Password Reset', 'Session Management'];
    } else if (context.mainFeature === 'Documentation') {
      context.relatedFeatures = ['Feature Analysis', 'Code Change Tracking', 'Documentation Export'];
    }

    return context;
  };

  const generateDocumentation = async () => {
    setIsGenerating(true);
    try {
      if (!feature) throw new Error('Feature not found');
      
      const featureContext = identifyFeatureContext(feature);
      const patterns = analyzeCodeChanges(feature.code_changes);

      // Generate user-focused documentation
      const userDocs = {
        overview: generateOverview(feature, featureContext),
        steps: generateSteps(featureContext.userFlows),
        use_cases: generateUseCases(featureContext),
        faq: generateFAQ(featureContext, patterns),
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

  const analyzeCodeChanges = (changes: ExtendedFeature['code_changes']) => {
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

  const generateOverview = (feature: ExtendedFeature, context: FeatureContext) => {
    return `${feature.name} is part of the ${context.mainFeature} system, specifically handling ${context.subFeature}. ` +
           `This feature provides a user-friendly way to ${feature.description?.toLowerCase() || ''}. ` +
           `It's commonly used alongside ${context.relatedFeatures.join(', ')}.`;
  };

  const generateSteps = (userFlows: UserFlow[]) => {
    const steps: string[] = [];
    userFlows.forEach(flow => {
      if (flow.prerequisites) {
        steps.push(`Before ${flow.action}, ensure you have: ${flow.prerequisites.join(', ')}`);
      }
      steps.push(`To ${flow.action}:`);
      flow.steps.forEach(step => steps.push(step));
    });
    return steps;
  };

  const generateUseCases = (context: FeatureContext) => {
    const useCases = context.userFlows.map(flow => 
      `Use this feature when you need to ${flow.action.toLowerCase()}`
    );
    return useCases;
  };

  const generateFAQ = (context: FeatureContext, patterns: any) => {
    const faq: Array<{ question: string; answer: string }> = [];
    
    // Add context-specific questions
    faq.push({
      question: `How does this feature fit into the ${context.mainFeature} system?`,
      answer: `This feature is a key part of ${context.subFeature}, helping users to ${context.userFlows[0]?.action.toLowerCase() || 'perform actions'} within the ${context.mainFeature} system.`
    });

    // Add related features question
    if (context.relatedFeatures.length > 0) {
      faq.push({
        question: "What other features should I know about?",
        answer: `This feature works well with ${context.relatedFeatures.join(', ')}. Consider exploring these related features to get the most out of the system.`
      });
    }

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
