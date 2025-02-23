import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { Feature, Repository } from '@/types';

const DOCUPAD_PREDEFINED_DOCS = {
  "Document Editor": {
    overview: "Create and edit documents right in your browser.",
    benefit: "Write, format, and organize your content without switching between apps.",
    example: "Taking notes during a team meeting",
    steps: [
      "Click 'New Document' in the top menu",
      "Type your document title and press Enter",
      "Write your content using the rich text editor",
      "Use the toolbar to format text and add elements",
      "Click 'Save' to store your work"
    ],
    scenarios: [
      {
        scenario: "When you need to create a meeting agenda",
        steps: "Choose 'Meeting Template' → Fill in topics → Add time slots → Share with team",
        outcome: "A structured agenda ready to guide your meeting"
      },
      {
        scenario: "When you want to write a blog post",
        steps: "Start with 'Blog Template' → Draft content → Add images → Preview → Publish",
        outcome: "A professionally formatted blog post ready to share"
      }
    ],
    faq: [
      {
        question: "Can I work on my document offline?",
        answer: "Yes! Changes sync automatically when you're back online"
      },
      {
        question: "How do I add images to my document?",
        answer: "Click the image icon in the toolbar or drag and drop images directly"
      }
    ]
  },
  "Team Collaboration": {
    overview: "Work together with your team in real-time on any document.",
    benefit: "Get feedback and make decisions faster with live collaboration.",
    example: "Brainstorming ideas with remote team members",
    steps: [
      "Open your document",
      "Click 'Share' in the top right",
      "Enter team members' emails",
      "Choose edit or view access",
      "Click 'Send Invites'"
    ],
    scenarios: [
      {
        scenario: "When reviewing a proposal with clients",
        steps: "Share view-only link → Set expiry date → Add password protection → Send link",
        outcome: "Secure document sharing with controlled access"
      },
      {
        scenario: "When collaborating on team documentation",
        steps: "Add team members → Enable comments → Set up notifications → Start collaborating",
        outcome: "Everyone can contribute while tracking all changes"
      }
    ],
    faq: [
      {
        question: "Can I see who's viewing my document?",
        answer: "Yes, active viewers appear as avatars in the top right corner"
      },
      {
        question: "How do I resolve conflicting edits?",
        answer: "The version history shows all changes, letting you choose which to keep"
      }
    ]
  },
  "Document Organization": {
    overview: "Keep your documents organized in folders and workspaces.",
    benefit: "Find what you need instantly with smart organization tools.",
    example: "Managing project documentation across teams",
    steps: [
      "Click 'New Folder' in the sidebar",
      "Name your folder",
      "Drag documents into the folder",
      "Use tags to categorize content",
      "Set up quick access favorites"
    ],
    scenarios: [
      {
        scenario: "When setting up a new project workspace",
        steps: "Create project folder → Add subfolders → Set permissions → Invite team",
        outcome: "An organized project space where everyone knows where things are"
      },
      {
        scenario: "When archiving completed work",
        steps: "Select documents → Move to archive → Add completion date → Update status",
        outcome: "Clean workspace while keeping records accessible"
      }
    ],
    faq: [
      {
        question: "How do I quickly find documents?",
        answer: "Use the search bar or filter by tags, dates, and authors"
      },
      {
        question: "Can I move documents between folders?",
        answer: "Yes, simply drag and drop or use the 'Move to' option"
      }
    ]
  },
  "Document Export": {
    overview: "Export your documents in multiple formats for any use case.",
    benefit: "Share your work in the format that works best for your audience.",
    example: "Converting a document to PDF for printing",
    steps: [
      "Open your document",
      "Click 'Export' in the menu",
      "Choose your format (PDF, Word, HTML)",
      "Adjust export settings",
      "Click 'Download'"
    ],
    scenarios: [
      {
        scenario: "When preparing a document for print",
        steps: "Select PDF format → Adjust margins → Preview → Export high-quality version",
        outcome: "Print-ready document with perfect formatting"
      },
      {
        scenario: "When sharing with external tools",
        steps: "Choose format → Set compatibility options → Export → Verify output",
        outcome: "A properly formatted file ready to use in other applications"
      }
    ],
    faq: [
      {
        question: "What formats can I export to?",
        answer: "PDF, Word, HTML, Markdown, and Plain Text are supported"
      },
      {
        question: "Will my formatting be preserved?",
        answer: "Yes, we ensure formatting stays consistent across formats"
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
