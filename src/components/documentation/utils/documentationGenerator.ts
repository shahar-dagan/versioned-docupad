
import { ExtendedFeature, FeatureContext, DocumentationPatterns, UserDocs } from '../types';

const analyzeFeature = (feature: ExtendedFeature): string[] => {
  // Step 1: Examine the Code (internal analysis)
  const coreComponents = [
    'Feature Management',
    'Documentation Generation',
    'GitHub Integration',
    'Change Tracking'
  ];

  // Step 2: List Overall Functionalities
  const allFunctionalities = [
    'Feature creation and management',
    'Automatic documentation generation',
    'Version control integration',
    'Team collaboration tools',
    'Change history tracking',
    'Documentation sharing'
  ];

  // Step 3: Shortlist User-Facing Features
  return [
    'Create and manage features',
    'Generate automatic documentation',
    'Share with team members',
    'Track changes and updates'
  ];
};

const createUserFriendlyGuides = (feature: ExtendedFeature) => {
  // Step 4: User-Friendly Titles and Explanations
  return {
    'Getting Started': {
      title: 'Your First Steps',
      explanation: 'Learn how to begin using this feature effectively',
      realLifeExample: 'Perfect for when you\'re setting up a new project or feature'
    },
    'Creating Content': {
      title: 'Adding Your Content',
      explanation: 'Add and organize your feature details',
      realLifeExample: 'Use this when documenting a new feature in your product'
    },
    'Sharing & Collaboration': {
      title: 'Working with Your Team',
      explanation: 'Share and collaborate on documentation',
      realLifeExample: 'Great for team projects and knowledge sharing'
    },
    'Tracking Changes': {
      title: 'Keeping Everything Updated',
      explanation: 'Monitor and manage feature updates',
      realLifeExample: 'Useful when your team makes changes to features'
    }
  };
};

export const generateOverview = (feature: ExtendedFeature, context: FeatureContext): string => {
  const guides = createUserFriendlyGuides(feature);
  const mainFeatures = analyzeFeature(feature);
  
  return `Welcome to ${feature.name}! This guide will help you make the most of this feature.\n\n` +
         `What you can do with ${feature.name}:\n` +
         mainFeatures.map(f => `• ${f}\n`).join('') +
         `\nReal-world usage:\n` +
         Object.values(guides).map(g => `• ${g.realLifeExample}\n`).join('');
};

export const generateSteps = (userFlows: FeatureContext['userFlows']): string[] => {
  // Step 5: User-Focused Documentation
  const startingSteps = [
    'Getting Started:',
    '1. Open your dashboard',
    '2. Navigate to the Features section',
    '3. Select the feature you want to use',
    '',
    'Creating Your First Feature:',
    '1. Click the "Add Feature" button',
    '2. Enter a clear, descriptive name',
    '3. Add details about what your feature does',
    '4. Save your changes',
    '',
    'Managing Your Feature:',
    '1. Find your feature in the list',
    '2. Click to view or edit',
    '3. Make any necessary updates',
    '4. Generate documentation automatically',
    '',
    'Working with Documentation:',
    '1. Select your feature',
    '2. Click "Generate Documentation"',
    '3. Review the generated content',
    '4. Share with your team'
  ];

  const customFlows = userFlows.flatMap(flow => [
    `\n${flow.action}:`,
    ...flow.steps.map((step, i) => `${i + 1}. ${step}`)
  ]);

  return [...startingSteps, ...customFlows];
};

export const generateUseCases = (context: FeatureContext): string[] => {
  // Real-world scenarios for users
  return [
    'When you need to document a new product feature for your team',
    'When training new team members on existing features',
    'When updating documentation after making changes',
    'When sharing feature details with stakeholders',
    'When organizing your product documentation',
    'When collaborating on feature development'
  ];
};

export const generateFAQ = (context: FeatureContext, patterns: DocumentationPatterns): Array<{ question: string; answer: string }> => {
  return [
    {
      question: "How do I get started with a new feature?",
      answer: "Start from your dashboard, click 'Add Feature', enter the details, and click Save. You can then generate documentation automatically."
    },
    {
      question: "Can I update my documentation later?",
      answer: "Yes! You can update your documentation anytime. Just select your feature and click 'Generate Documentation' to refresh it with your latest changes."
    },
    {
      question: "How do I share documentation with my team?",
      answer: "Your documentation is automatically available to all team members who have access to your product. They can find it in the Documentation section."
    },
    {
      question: "What happens when I update a feature?",
      answer: "Any changes you make are tracked automatically. The documentation can be regenerated to reflect your updates, keeping everything in sync."
    },
    {
      question: "Can I customize the generated documentation?",
      answer: "Yes, after generation you can edit and customize the documentation to better suit your needs while maintaining the automatic structure."
    }
  ];
};

export const generateDocumentation = (feature: ExtendedFeature, context: FeatureContext, patterns: DocumentationPatterns): UserDocs => {
  // Combine all sections following our structured approach
  return {
    overview: generateOverview(feature, context),
    steps: generateSteps(context.userFlows),
    use_cases: generateUseCases(context),
    faq: generateFAQ(context, patterns),
  };
};
