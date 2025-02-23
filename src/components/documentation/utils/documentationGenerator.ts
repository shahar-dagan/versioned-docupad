
import { ExtendedFeature, FeatureContext, DocumentationPatterns, UserDocs } from '../types';
import { PROMPTS } from '@/lib/prompts';

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

const analyzeFeature = (feature: ExtendedFeature): string[] => {
  const codeAnalysis = {
    components: feature.code_changes?.map(change => change.file_path) || [],
    changeTypes: feature.code_changes?.map(change => change.change_type) || [],
    descriptions: feature.code_changes?.map(change => change.change_description) || []
  };

  const functionalityPatterns = new Set<string>();
  const userInteractions = new Set<string>();

  // Extract user interactions from code
  feature.code_changes?.forEach(change => {
    if (!change.content) return;

    // Look for event handlers
    const eventMatches = change.content.match(/on[A-Z]\w+={[^}]+}/g) || [];
    eventMatches.forEach(match => {
      const eventType = match.match(/on([A-Z]\w+)/) || [];
      if (eventType[1]) {
        userInteractions.add(`${eventType[1].toLowerCase()} interaction`);
      }
    });

    // Look for form submissions
    if (change.content.includes('handleSubmit') || change.content.includes('onSubmit')) {
      userInteractions.add('Form submission');
    }

    // Look for navigation
    if (change.content.includes('useNavigate') || change.content.includes('<Link')) {
      userInteractions.add('Navigation');
    }

    // Look for data operations
    if (change.content.includes('useQuery') || change.content.includes('useMutation')) {
      userInteractions.add('Data management');
    }
  });

  return Array.from(new Set([
    ...Array.from(functionalityPatterns),
    ...Array.from(userInteractions)
  ]));
};

const createUserFriendlyGuides = (feature: ExtendedFeature) => {
  // Try to match feature name with predefined docs
  const predefinedDoc = Object.entries(DOCUPAD_PREDEFINED_DOCS).find(([key]) => 
    feature.name.toLowerCase().includes(key.toLowerCase())
  );

  if (predefinedDoc) {
    const [_, docs] = predefinedDoc;
    return {
      [feature.name]: {
        title: feature.name,
        explanation: docs.overview,
        steps: docs.steps
      }
    };
  }

  // Default behavior for features without predefined docs
  const guides: Record<string, {
    title: string;
    explanation: string;
    steps: string[];
  }> = {};

  feature.code_changes?.forEach(change => {
    if (!change.content) return;

    // Extract form interactions
    const formMatches = change.content.match(/<form[^>]*>[\s\S]*?<\/form>/g) || [];
    formMatches.forEach(form => {
      guides[`Using ${feature.name} Form`] = {
        title: `Using ${feature.name} Form`,
        explanation: "How to submit information",
        steps: [
          "Fill in all required fields",
          "Validate your input",
          "Submit the form",
          "Check for confirmation message"
        ]
      };
    });

    // Extract button interactions
    const buttonMatches = change.content.match(/<button[^>]*>[\s\S]*?<\/button>/g) || [];
    buttonMatches.forEach(button => {
      const actionText = button.match(/>([^<]+)</)?.[1] || 'action';
      guides[`Performing ${actionText}`] = {
        title: `Performing ${actionText}`,
        explanation: `How to ${actionText.toLowerCase()}`,
        steps: [
          `Locate the ${actionText} button`,
          "Click the button",
          "Wait for the action to complete",
          "Verify the result"
        ]
      };
    });
  });

  return guides;
};

export const generateDocumentation = (feature: ExtendedFeature, context: FeatureContext, patterns: DocumentationPatterns): UserDocs => {
  const predefinedDoc = Object.entries(DOCUPAD_PREDEFINED_DOCS).find(([key]) => 
    feature.name.toLowerCase().includes(key.toLowerCase())
  );

  if (predefinedDoc) {
    const [_, docs] = predefinedDoc;
    return {
      overview: `${docs.overview}\n\n${docs.benefit}\n\nExample use case: ${docs.example}`,
      steps: docs.steps,
      use_cases: docs.scenarios.map(s => `${s.scenario}: ${s.steps} → ${s.outcome}`),
      faq: docs.faq
    };
  }

  // Fallback to generated documentation
  const guides = createUserFriendlyGuides(feature);
  const mainFeatures = analyzeFeature(feature);

  const steps = Object.values(guides).flatMap(guide => guide.steps);
  const useCases = mainFeatures.map(feature => `When you need to ${feature.toLowerCase()}`);

  const faq = mainFeatures.map(feature => ({
    question: `How do I ${feature.toLowerCase()}?`,
    answer: guides[feature]?.steps.join(' Then ') || `Use the ${feature.toLowerCase()} functionality in the interface.`
  }));

  return {
    overview: `${feature.name} allows you to ${mainFeatures.join(', ')}. Here's how to use it effectively.`,
    steps,
    use_cases: useCases,
    faq
  };
};
