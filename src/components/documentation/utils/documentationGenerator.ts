
import { ExtendedFeature, FeatureContext, DocumentationPatterns, UserDocs } from '../types';

export const generateOverview = (feature: ExtendedFeature, context: FeatureContext): string => {
  return `${feature.name} helps you ${feature.description?.toLowerCase() || 'manage your product'}. ` +
         `Here's what you can do with this feature:\n\n` +
         `• Create and configure settings\n` +
         `• Track changes and updates\n` +
         `• Generate documentation automatically\n` +
         `• Collaborate with your team`;
};

export const generateSteps = (userFlows: FeatureContext['userFlows']): string[] => {
  const commonSteps = [
    'Getting Started:',
    '1. Go to the Products page',
    '2. Select your product',
    '3. Navigate to the Features section',
    '',
    'To add a new feature:',
    '1. Click the "Add Feature" button',
    '2. Enter the feature name and description',
    '3. Click Create to save your feature',
    '',
    'To manage existing features:',
    '1. Find your feature in the list',
    '2. Click on it to view details',
    '3. Use the available actions to make changes',
    '',
    'To generate documentation:',
    '1. Select your feature',
    '2. Click "Generate Documentation"',
    '3. Review the generated docs',
    '4. Make any necessary adjustments',
  ];

  return [...commonSteps, '', ...userFlows.map(flow => `${flow.action}:`).concat(
    flow.steps.map((step, i) => `${i + 1}. ${step}`)
  )];
};

export const generateUseCases = (context: FeatureContext): string[] => {
  return [
    'When you want to add a new product feature',
    'When you need to document existing functionality',
    'When tracking changes to your product',
    'When collaborating with team members',
    'When organizing product documentation',
    'When updating feature configurations'
  ];
};

export const generateFAQ = (context: FeatureContext, patterns: DocumentationPatterns): Array<{ question: string; answer: string }> => {
  return [
    {
      question: "How do I get started with a new feature?",
      answer: "Start by clicking the 'Add Feature' button in the Features section. Fill in the name and description, then click Create. You can then configure additional settings and generate documentation."
    },
    {
      question: "Can I update feature information later?",
      answer: "Yes! You can update feature details anytime. Simply select the feature from the list and use the edit options to make changes."
    },
    {
      question: "How does documentation generation work?",
      answer: "Documentation is generated automatically based on your feature configuration. Click 'Generate Documentation' to create user guides and technical docs. You can review and adjust the content as needed."
    },
    {
      question: "Who can access and modify features?",
      answer: "Team members with appropriate permissions can view and modify features. Admins can manage access rights through the product settings."
    },
    {
      question: "How do I organize multiple features?",
      answer: "Features are organized under their respective products. Use the search and filter options to find specific features, and the documentation section to keep everything well-documented."
    }
  ];
};

export const generateDocumentation = (feature: ExtendedFeature, context: FeatureContext, patterns: DocumentationPatterns): UserDocs => {
  return {
    overview: generateOverview(feature, context),
    steps: generateSteps(context.userFlows),
    use_cases: generateUseCases(context),
    faq: generateFAQ(context, patterns),
  };
};
