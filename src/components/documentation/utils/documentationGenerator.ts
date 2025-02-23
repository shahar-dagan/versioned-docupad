import { ExtendedFeature, FeatureContext, DocumentationPatterns, UserDocs } from '../types';
import { PROMPTS } from '@/lib/prompts';

const DOCUPAD_PREDEFINED_DOCS = {
  "Create New Products": {
    overview: "Add new products to your project to track various applications, tools, or features your team is working on.",
    benefit: "Organize and manage different projects in one centralized location.",
    example: "Starting documentation for a new software application",
    steps: [
      "Click 'Create Product' from the dashboard",
      "Enter the product name in the provided field",
      "Add a description to the product (optional)",
      "Click 'Save'",
      "Your new product will appear in the product list"
    ],
    scenarios: [
      {
        scenario: "When launching a new mobile app",
        steps: "Create product → Add app details → Set up initial documentation",
        outcome: "New product workspace ready for development tracking"
      },
      {
        scenario: "When expanding your product line",
        steps: "Create product → Define scope → Invite team members",
        outcome: "New product configured for team collaboration"
      },
      {
        scenario: "When testing a feature prototype",
        steps: "Create product → Add prototype details → Start feature tracking",
        outcome: "Testing environment ready for documentation"
      }
    ],
    faq: [
      {
        question: "Can I edit the product name later?",
        answer: "Yes, simply click on the product and select 'Edit' to update any details"
      },
      {
        question: "What if I enter the wrong information?",
        answer: "You can update product details anytime from the product page"
      }
    ]
  },
  "Delete Products": {
    overview: "Remove products you no longer need to keep your workspace clean and focused.",
    benefit: "Maintain a clutter-free workspace with only active products.",
    example: "Removing a discontinued project",
    steps: [
      "Navigate to the product list",
      "Locate the product you want to delete",
      "Click the 'Delete' icon next to the product name",
      "Confirm the deletion in the pop-up window",
      "The product will be removed from your list"
    ],
    scenarios: [
      {
        scenario: "When a project gets canceled",
        steps: "Find product → Click Delete → Confirm removal",
        outcome: "Product and associated documentation removed"
      },
      {
        scenario: "When clearing test products",
        steps: "Identify test products → Delete each → Confirm actions",
        outcome: "Workspace cleaned of test data"
      }
    ],
    faq: [
      {
        question: "Can I recover a deleted product?",
        answer: "No, deletion is permanent. Make sure you want to remove it"
      },
      {
        question: "How can I prevent accidental deletions?",
        answer: "A confirmation pop-up helps avoid mistakes, and only admin users can delete products"
      }
    ]
  },
  "View Products": {
    overview: "Access and manage all your products from a centralized list view.",
    benefit: "Quick access to all projects and their documentation.",
    example: "Reviewing all active projects",
    steps: [
      "Go to the 'Products' section",
      "Browse through the list of products",
      "Use filters or search to find specific products",
      "Click on any product to view details"
    ],
    scenarios: [
      {
        scenario: "When reviewing ongoing projects",
        steps: "Open Products → Apply filters → Review status",
        outcome: "Complete overview of all active products"
      },
      {
        scenario: "When assigning team members",
        steps: "Find product → Open settings → Add team members",
        outcome: "Team successfully assigned to product"
      }
    ],
    faq: [
      {
        question: "Can I sort the product list?",
        answer: "Yes, use the sort options at the top of the list to organize by name, date, or status"
      },
      {
        question: "How do I quickly find a product?",
        answer: "Use the search bar at the top of the list to find products by name or description"
      }
    ]
  },
  "Add Descriptions": {
    overview: "Provide detailed information about your products for better documentation.",
    benefit: "Clear product context for team members and stakeholders.",
    example: "Adding technical specifications to a product",
    steps: [
      "Select a product from the list",
      "Click 'Edit Description'",
      "Enter your description in the text box",
      "Click 'Save' to update"
    ],
    scenarios: [
      {
        scenario: "When onboarding new team members",
        steps: "Open product → Add context → Save details",
        outcome: "Clear product documentation for new team members"
      },
      {
        scenario: "When updating project scope",
        steps: "Edit description → Update goals → Save changes",
        outcome: "Updated project information available to all"
      }
    ],
    faq: [
      {
        question: "Is there a character limit?",
        answer: "Yes, descriptions are limited to 500 characters for clarity"
      },
      {
        question: "Can I use formatting in descriptions?",
        answer: "Yes, markdown formatting is supported for better readability"
      }
    ]
  },
  "Link GitHub": {
    overview: "Connect your product with its GitHub repository for seamless development tracking.",
    benefit: "Automatic code analysis and documentation updates.",
    example: "Connecting a new project's codebase",
    steps: [
      "Select a product",
      "Click 'Link Repository'",
      "Choose your GitHub repository",
      "Confirm the connection",
      "Repository will be analyzed automatically"
    ],
    scenarios: [
      {
        scenario: "When starting a new project",
        steps: "Create product → Link repo → Start tracking",
        outcome: "Automated documentation pipeline set up"
      },
      {
        scenario: "When adding code analysis",
        steps: "Find product → Link GitHub → Configure analysis",
        outcome: "Code changes automatically documented"
      }
    ],
    faq: [
      {
        question: "Can I link multiple repositories?",
        answer: "Yes, you can link multiple repositories to a single product"
      },
      {
        question: "What if I need to change the repository?",
        answer: "You can unlink the current repository and link a new one at any time"
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

  feature.code_changes?.forEach(change => {
    if (!change.content) return;

    const eventMatches = change.content.match(/on[A-Z]\w+={[^}]+}/g) || [];
    eventMatches.forEach(match => {
      const eventType = match.match(/on([A-Z]\w+)/) || [];
      if (eventType[1]) {
        userInteractions.add(`${eventType[1].toLowerCase()} interaction`);
      }
    });

    if (change.content.includes('handleSubmit') || change.content.includes('onSubmit')) {
      userInteractions.add('Form submission');
    }

    if (change.content.includes('useNavigate') || change.content.includes('<Link')) {
      userInteractions.add('Navigation');
    }

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

  const guides: Record<string, {
    title: string;
    explanation: string;
    steps: string[];
  }> = {};

  feature.code_changes?.forEach(change => {
    if (!change.content) return;

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
  const priorityFeatures = [
    "Create New Products",
    "Delete Products",
    "View Products",
    "Add Descriptions",
    "Link GitHub"
  ];

  const matchingPriorityFeature = priorityFeatures.find(pf => 
    feature.name.toLowerCase().includes(pf.toLowerCase())
  );

  if (matchingPriorityFeature) {
    const docs = DOCUPAD_PREDEFINED_DOCS[matchingPriorityFeature];
    return {
      overview: `${docs.overview}\n\n${docs.benefit}\n\nExample use case: ${docs.example}`,
      steps: docs.steps,
      use_cases: docs.scenarios.map(s => `${s.scenario}: ${s.steps} → ${s.outcome}`),
      faq: docs.faq
    };
  }

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
