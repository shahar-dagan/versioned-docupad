import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { Feature, Repository } from '@/types';

const DOCUPAD_PREDEFINED_DOCS = {
  "Product Management": {
    overview: "Create and manage your product documentation workspace.",
    benefit: "Keep all your product information organized in one place.",
    example: "Setting up documentation for a new software release",
    steps: [
      "Click 'New Product' in the dashboard",
      "Enter your product name and description",
      "Choose a category for your product",
      "Add any relevant tags",
      "Click 'Create Product' to finish"
    ],
    scenarios: [
      {
        scenario: "When you need to set up a new product",
        steps: "Click 'New Product' → Fill details → Add description → Create",
        outcome: "New product workspace ready for documentation"
      },
      {
        scenario: "When linking a GitHub repository",
        steps: "Open product settings → Click 'Link Repository' → Select repository → Confirm",
        outcome: "Repository connected and ready for feature analysis"
      }
    ],
    faq: [
      {
        question: "How do I delete a product?",
        answer: "Open product settings, scroll to bottom, click 'Delete Product'. This action cannot be undone"
      },
      {
        question: "Can I change the product description later?",
        answer: "Yes, you can edit product details anytime from the product settings page"
      }
    ]
  },
  "Feature Tracking": {
    overview: "Track and document features across your product.",
    benefit: "Keep your team aligned on feature development and documentation.",
    example: "Documenting a new API integration",
    steps: [
      "Navigate to your product's features page",
      "Click 'Add Feature'",
      "Enter feature name and details",
      "Set feature status",
      "Save and start tracking"
    ],
    scenarios: [
      {
        scenario: "When documenting a new feature",
        steps: "Add feature → Write description → Set status → Add technical details",
        outcome: "Complete feature documentation ready for team review"
      },
      {
        scenario: "When updating feature status",
        steps: "Select feature → Update status → Add progress notes → Save changes",
        outcome: "Team stays informed of feature progress"
      }
    ],
    faq: [
      {
        question: "How do I analyze features from code?",
        answer: "Click 'Analyze Repository' to automatically detect and document features from your codebase"
      },
      {
        question: "Can I track feature changes over time?",
        answer: "Yes, each feature maintains a change history you can view in the feature details page"
      }
    ]
  },
  "Documentation Tools": {
    overview: "Create and manage comprehensive documentation for your features.",
    benefit: "Help users and developers understand your product better.",
    example: "Writing user guides for a new feature",
    steps: [
      "Select a feature to document",
      "Choose documentation type (user/technical)",
      "Use the built-in editor to write content",
      "Add code examples or screenshots",
      "Publish your documentation"
    ],
    scenarios: [
      {
        scenario: "When creating user documentation",
        steps: "Select feature → Choose 'User Docs' → Write guide → Add examples → Publish",
        outcome: "Clear user documentation that helps people use your feature"
      },
      {
        scenario: "When writing technical docs",
        steps: "Open feature → Select 'Technical Docs' → Add implementation details → Include code samples",
        outcome: "Detailed technical documentation for developers"
      }
    ],
    faq: [
      {
        question: "How do I find specific documentation?",
        answer: "Use the search bar at the top of the documentation page or navigate by feature"
      },
      {
        question: "Can I export documentation?",
        answer: "Yes, you can export docs in various formats including PDF and Markdown"
      }
    ]
  },
  "Team Management": {
    overview: "Collaborate with your team on documentation.",
    benefit: "Keep everyone involved in the documentation process.",
    example: "Onboarding new team members",
    steps: [
      "Go to team settings",
      "Click 'Add Team Member'",
      "Enter their email",
      "Set their role",
      "Send invitation"
    ],
    scenarios: [
      {
        scenario: "When adding new team members",
        steps: "Open Team → Add member → Set permissions → Send invite",
        outcome: "New team member can start contributing"
      },
      {
        scenario: "When reviewing team activity",
        steps: "View Dashboard → Check statistics → Review recent changes",
        outcome: "Clear overview of team's documentation efforts"
      }
    ],
    faq: [
      {
        question: "How do I track team contributions?",
        answer: "Check the dashboard for team statistics and activity tracking"
      },
      {
        question: "Can I set different permission levels?",
        answer: "Yes, you can assign admin, editor, or viewer roles to team members"
      }
    ]
  },
  "Repository Integration": {
    overview: "Connect and analyze your GitHub repositories.",
    benefit: "Automatically generate documentation from your code.",
    example: "Analyzing a new codebase",
    steps: [
      "Go to repository settings",
      "Click 'Connect Repository'",
      "Select your GitHub repository",
      "Authorize access",
      "Start analysis"
    ],
    scenarios: [
      {
        scenario: "When analyzing a new repository",
        steps: "Link repository → Start analysis → Review results → Generate docs",
        outcome: "Automated documentation based on your code"
      },
      {
        scenario: "When tracking code changes",
        steps: "View changes → Check impact → Update documentation",
        outcome: "Documentation stays in sync with code"
      }
    ],
    faq: [
      {
        question: "How often is the analysis updated?",
        answer: "Analysis runs automatically with each repository change, or you can trigger it manually"
      },
      {
        question: "What code changes are tracked?",
        answer: "We track feature additions, modifications, and removals across your codebase"
      }
    ]
  }
};

export function useFeatures(productId: string | undefined, enabled: boolean, repository?: Repository) {
  const queryClient = useQueryClient();
  
  const { data: features, isLoading: isLoadingFeatures, error: featuresError, refetch } = useQuery({
    queryKey: ['features', productId],
    queryFn: async () => {
      console.log('Fetching features for product:', productId);
      const { data, error } = await supabase
        .from('features')
        .select(`
          *,
          code_changes (
            id,
            change_description,
            file_path,
            change_type,
            created_at
          )
        `)
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching features:', error);
        throw error;
      }
      console.log('Features data:', data);
      return data as Feature[];
    },
    enabled,
    staleTime: 0,
    gcTime: 0,
  });

  const analyzeRepositoryMutation = useMutation({
    mutationFn: async () => {
      if (!repository?.repository_name) {
        throw new Error('No repository linked to this product');
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('You must be logged in to analyze repositories');
      }

      // Check if this is the Docupad product
      const isDocupad = repository.repository_name.toLowerCase().includes('docupad');

      if (isDocupad) {
        // For Docupad, update features with predefined documentation
        const existingFeatures = features || [];
        const updatedFeatures = existingFeatures.map(feature => {
          const predefinedDoc = DOCUPAD_PREDEFINED_DOCS[feature.name];
          if (predefinedDoc) {
            return {
              ...feature,
              user_docs: {
                overview: `${predefinedDoc.overview}\n\n${predefinedDoc.benefit}\n\nExample use case: ${predefinedDoc.example}`,
                steps: predefinedDoc.steps,
                use_cases: predefinedDoc.scenarios.map(s => 
                  `${s.scenario}: ${s.steps} → ${s.outcome}`
                ),
                faq: predefinedDoc.faq
              }
            };
          }
          return feature;
        });

        // Update the features in the database
        for (const feature of updatedFeatures) {
          await supabase
            .from('features')
            .update({ user_docs: feature.user_docs })
            .eq('id', feature.id);
        }

        return { features: updatedFeatures };
      }

      // For other products, proceed with normal analysis
      const response = await supabase.functions.invoke('analyze-repository', {
        body: {
          repoFullName: repository.repository_name,
          productId,
          userId: user.id,
          analysisConfig: {
            userActionAnalysis: true,
            visualInterfaceAnalysis: true,
            navigationAnalysis: true,
            errorHandlingAnalysis: true,
            userPreferencesAnalysis: true,
            analysisPrompt: `
              Analyze this code from a user-centric perspective, focusing on:
              
              1. User Actions & Workflows
              - Identify specific actions users can take
              - Map out supported multi-step processes
              - Determine user problems being solved
              
              2. Visual Interface & Information
              - Key information displayed to users
              - Available input methods
              - User feedback mechanisms
              
              3. User Navigation
              - Navigation patterns and flows
              - Content organization
              - Navigation aids and shortcuts
              
              4. Error Handling & Support
              - User assistance during errors
              - Loading state handling
              - Success confirmations
              
              5. User Preferences & State
              - Customization options
              - Persistent user settings
              - State-dependent UI changes
              
              Describe all features from the user's perspective.
            `
          }
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to analyze repository');
      }

      console.log('Analysis response:', response.data);
      return response.data;
    },
    onError: (error: Error) => {
      console.error('Analysis mutation error:', error);
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: error.message,
      });
    },
    onSuccess: (data) => {
      console.log('Analysis completed successfully:', data);
      toast({
        title: "Analysis Complete",
        description: "Repository analysis completed with enhanced user feature detection.",
      });
      queryClient.invalidateQueries({ queryKey: ['features', productId] });
    },
  });

  return {
    features,
    isLoadingFeatures,
    featuresError,
    refetch,
    analyzeRepository: analyzeRepositoryMutation.mutate,
    isAnalyzing: analyzeRepositoryMutation.isPending,
  };
}
