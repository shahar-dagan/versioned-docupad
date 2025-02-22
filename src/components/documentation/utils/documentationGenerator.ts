
import { ExtendedFeature, FeatureContext, DocumentationPatterns, UserDocs } from '../types';

export const generateOverview = (feature: ExtendedFeature, context: FeatureContext): string => {
  return `This ${context.subFeature} helps you ${feature.description?.toLowerCase() || 'manage your product features'}. ` +
         `As part of the ${context.mainFeature}, it provides tools for ${context.userFlows.map(f => f.action.toLowerCase()).join(' and ')}. ` +
         `You can use it alongside ${context.relatedFeatures.join(', ')} to effectively manage your product.`;
};

export const generateSteps = (userFlows: FeatureContext['userFlows']): string[] => {
  const steps: string[] = [];
  userFlows.forEach(flow => {
    // Add prerequisites as a checklist
    if (flow.prerequisites?.length) {
      steps.push('Before you begin, make sure you have:');
      flow.prerequisites.forEach(prereq => 
        steps.push(`✓ ${prereq}`)
      );
      steps.push(''); // Add spacing
    }

    // Add main steps with clear actions
    steps.push(`To ${flow.action.toLowerCase()}:`);
    flow.steps.forEach((step, index) => 
      steps.push(`${index + 1}. ${step}`)
    );
    steps.push(`Expected outcome: ${flow.expectedOutcome}`);
    steps.push(''); // Add spacing between flows
  });
  return steps;
};

export const generateUseCases = (context: FeatureContext): string[] => {
  return [
    ...context.userFlows.map(flow => 
      `When you need to ${flow.action.toLowerCase()}`
    ),
    `When managing multiple product features`,
    `When updating product configurations`,
    `When collaborating with team members on product management`
  ];
};

export const generateFAQ = (context: FeatureContext, patterns: DocumentationPatterns): Array<{ question: string; answer: string }> => {
  const faq: Array<{ question: string; answer: string }> = [
    {
      question: `What is the purpose of ${context.subFeature}?`,
      answer: `This feature helps you ${context.userFlows[0].action.toLowerCase()}. It's designed to streamline your product management workflow.`
    },
    {
      question: "How do I get started?",
      answer: context.userFlows[0]?.prerequisites?.length
        ? `First, ensure you have: ${context.userFlows[0].prerequisites.join(', ')}. Then follow the step-by-step guide above.`
        : "You can start using this feature right away from the Products section."
    },
    {
      question: "Can I modify settings after initial setup?",
      answer: "Yes, you can update your settings at any time. All changes are saved automatically, and you can review your modifications in real-time."
    },
    {
      question: "Who can access this feature?",
      answer: "Team members with appropriate permissions can access and modify product features. Make sure you have the necessary access rights before starting."
    }
  ];

  // Add data-specific questions if relevant
  if (patterns.dataOperations.size > 0) {
    faq.push({
      question: "Are my changes saved automatically?",
      answer: "Yes, all changes are saved automatically. You can always review your recent changes in the history section."
    });
  }

  return faq;
};

export const generateDocumentation = (feature: ExtendedFeature, context: FeatureContext, patterns: DocumentationPatterns): UserDocs => {
  return {
    overview: generateOverview(feature, context),
    steps: generateSteps(context.userFlows),
    use_cases: generateUseCases(context),
    faq: generateFAQ(context, patterns),
  };
};
