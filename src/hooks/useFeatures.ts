
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { Feature, Repository } from '@/types';

const DOCUPAD_PREDEFINED_DOCS = {
  "Document Creation": {
    overview: "Create and edit documents with a user-friendly interface.",
    benefit: "Save time by quickly creating professional documents.",
    example: "Writing a project proposal",
    steps: [
      "Click 'New Document'",
      "Choose a template (if desired)",
      "Enter your document content",
      "Click 'Save' to store your work"
    ],
    scenarios: [
      {
        scenario: "When you want to create a team memo",
        steps: "Select 'Memo' template → Fill in details → Send to team",
        outcome: "A professionally formatted memo ready for distribution"
      },
      {
        scenario: "When you need to write documentation",
        steps: "Start blank document → Use markdown formatting → Add sections",
        outcome: "Well-structured documentation that's easy to maintain"
      }
    ],
    faq: [
      {
        question: "How do I recover an unsaved document?",
        answer: "Check the 'Auto-saved drafts' section in your dashboard"
      },
      {
        question: "Can I collaborate with others?",
        answer: "Yes! Share the document link to allow team editing"
      }
    ]
  },
  "Version Control": {
    overview: "Track changes and maintain document history.",
    benefit: "Never lose important document versions.",
    example: "Reviewing document evolution over time",
    steps: [
      "Open document history",
      "Select a previous version",
      "Review changes highlighted in the diff view",
      "Restore version if needed"
    ],
    scenarios: [
      {
        scenario: "When you need to revert changes",
        steps: "View history → Select version → Click 'Restore'",
        outcome: "Document restored to previous state"
      },
      {
        scenario: "When reviewing team edits",
        steps: "Open version history → Compare changes → Accept/reject edits",
        outcome: "Clear overview of all document changes"
      }
    ],
    faq: [
      {
        question: "How long are versions kept?",
        answer: "Documents retain 30 days of version history"
      },
      {
        question: "Can I compare specific versions?",
        answer: "Yes, use the 'Compare' tool to see differences between any two versions"
      }
    ]
  },
  "Document Sharing": {
    overview: "Share and collaborate on documents with team members.",
    benefit: "Streamline team collaboration and feedback.",
    example: "Getting team input on a proposal",
    steps: [
      "Open document settings",
      "Click 'Share'",
      "Set permissions for team members",
      "Send invite links"
    ],
    scenarios: [
      {
        scenario: "When sharing with external clients",
        steps: "Create view-only link → Set expiration → Send to client",
        outcome: "Secure, time-limited document access"
      },
      {
        scenario: "When collaborating with the team",
        steps: "Add team members → Set edit rights → Start collaboration",
        outcome: "Real-time collaborative editing enabled"
      }
    ],
    faq: [
      {
        question: "How do I restrict access?",
        answer: "Use permission settings to control view/edit access"
      },
      {
        question: "Can I see who viewed my document?",
        answer: "Check the 'Activity Log' for viewer history"
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
