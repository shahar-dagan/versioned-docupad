
import { ExtendedFeature, FeatureContext, DocumentationPatterns, UserDocs } from '../types';

export const generateOverview = (feature: ExtendedFeature, context: FeatureContext): string => {
  return `Welcome to the ${feature.name} documentation! This guide will help you understand how to use this feature effectively.\n\n` +
         `Key things you can do:\n` +
         `• ${feature.description || 'Manage your product features'}\n` +
         `• Configure settings and preferences\n` +
         `• Generate automatic documentation\n` +
         `• Track changes and updates`;
};

export const generateSteps = (userFlows: FeatureContext['userFlows']): string[] => {
  const commonSteps = [
    'Getting Started with Documentation:',
    '1. Use the search bar at the top to find specific features',
    '2. Browse the feature list in the left sidebar',
    '3. Click on any feature to view its documentation',
    '',
    'Viewing Documentation:',
    '1. Choose between "How to Use" and "Technical Details"',
    '2. Follow the step-by-step guides',
    '3. Check the FAQ section for quick answers',
    '4. Review use cases for practical examples',
    '',
    'Managing Features:',
    '1. Click "Add Feature" to create a new feature',
    '2. Fill in the feature details',
    '3. Use "Generate Documentation" to create guides',
    '4. Review and customize the documentation'
  ];

  const flowSteps = userFlows.flatMap(flow => [
    `${flow.action}:`,
    ...flow.steps.map((step, i) => `${i + 1}. ${step}`)
  ]);

  return [...commonSteps, '', ...flowSteps];
};

export const generateUseCases = (context: FeatureContext): string[] => {
  return [
    'Finding documentation quickly using search',
    'Creating new feature documentation',
    'Understanding how to use specific features',
    'Getting quick answers from FAQs',
    'Tracking feature changes and updates',
    'Sharing documentation with team members'
  ];
};

export const generateFAQ = (context: FeatureContext, patterns: DocumentationPatterns): Array<{ question: string; answer: string }> => {
  return [
    {
      question: "How do I find documentation for a specific feature?",
      answer: "Use the search bar at the top of the page or browse the feature list in the left sidebar. Click on any feature to view its documentation."
    },
    {
      question: "What's the difference between 'How to Use' and 'Technical Details'?",
      answer: "'How to Use' provides step-by-step guides for everyday users, while 'Technical Details' contains implementation details for developers."
    },
    {
      question: "Can I create documentation for my own features?",
      answer: "Yes! Click 'Add Feature' to create a new feature, then use 'Generate Documentation' to automatically create guides and documentation."
    },
    {
      question: "How do I share documentation with my team?",
      answer: "All documentation is automatically shared with team members who have access to your product. They can access it through the same documentation section."
    },
    {
      question: "Where can I find recent changes to a feature?",
      answer: "Each feature's documentation includes a 'Recent Changes' section where you can track updates and modifications."
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
