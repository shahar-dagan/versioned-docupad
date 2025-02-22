
import { ExtendedFeature, FeatureContext, DocumentationPatterns, UserDocs } from '../types';

const analyzeFeature = (feature: ExtendedFeature): string[] => {
  // Step 1: Examine the Code (based on actual codebase)
  const mainFeatures = [
    'Documentation Management',
    'Feature Tracking',
    'GitHub Integration',
    'Change History'
  ];

  // Step 2: List Overall Functionalities (from actual implementation)
  const actualFunctionalities = [
    'View and generate documentation',
    'Switch between technical and user views',
    'Track feature changes and updates',
    'Integrate with GitHub repositories',
    'Manage feature lifecycle',
    'Share documentation with team'
  ];

  // Step 3: Shortlist User-Facing Features (based on UI components)
  return [
    'View feature documentation',
    'Generate automatic documentation',
    'Track feature changes',
    'Share with team members'
  ];
};

const createUserFriendlyGuides = (feature: ExtendedFeature) => {
  // Step 4: User-Friendly Titles and Explanations (based on actual features)
  return {
    'Documentation': {
      title: 'Documentation Viewer',
      explanation: 'Access and manage documentation for your features',
      realLifeExample: 'When you need to check how to use a specific feature'
    },
    'Feature Management': {
      title: 'Feature Manager',
      explanation: 'Create and organize your product features',
      realLifeExample: 'Adding a new feature to your product'
    },
    'GitHub Integration': {
      title: 'Code Integration',
      explanation: 'Connect your code repository for automatic updates',
      realLifeExample: 'Linking your GitHub repository to track changes'
    },
    'Change Tracking': {
      title: 'Feature Updates',
      explanation: 'Monitor and track changes to your features',
      realLifeExample: 'When your team updates a feature\'s functionality'
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
