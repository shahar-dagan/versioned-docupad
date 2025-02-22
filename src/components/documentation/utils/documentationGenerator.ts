
import { ExtendedFeature, FeatureContext, DocumentationPatterns, UserDocs } from '../types';

export const generateOverview = (feature: ExtendedFeature, context: FeatureContext): string => {
  return `The ${context.subFeature} feature helps you ${feature.description?.toLowerCase() || 'manage your content'}. ` +
         `As part of the ${context.mainFeature} system, it provides tools for ${context.userFlows.map(f => f.action.toLowerCase()).join(' and ')}. ` +
         `You'll often use this alongside ${context.relatedFeatures.join(', ')} to accomplish your tasks.`;
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
    if (flow.steps.length) {
      flow.steps.forEach((step, index) => 
        steps.push(`${index + 1}. ${step}`)
      );
    }
    steps.push(`Expected result: ${flow.expectedOutcome}`);
    steps.push(''); // Add spacing between flows
  });
  return steps;
};

export const generateUseCases = (context: FeatureContext): string[] => {
  const useCases = [
    ...context.userFlows.map(flow => 
      `When you need to ${flow.action.toLowerCase()}`
    ),
    // Add common scenarios based on feature type
    `When working with ${context.relatedFeatures.join(' or ')}`,
    `As part of your ${context.mainFeature.toLowerCase()} workflow`,
    `When you want to quickly ${context.subFeature.toLowerCase()}`
  ];
  return useCases;
};

export const generateFAQ = (context: FeatureContext, patterns: DocumentationPatterns): Array<{ question: string; answer: string }> => {
  const faq: Array<{ question: string; answer: string }> = [
    {
      question: `What can I do with the ${context.subFeature}?`,
      answer: `The ${context.subFeature} lets you ${context.userFlows.map(f => f.action.toLowerCase()).join(', ')}. It's designed to make ${context.mainFeature.toLowerCase()} tasks easier.`
    },
    {
      question: "What other features should I use with this?",
      answer: `For the best experience, use this feature along with ${context.relatedFeatures.join(', ')}. They work together to help you complete your tasks efficiently.`
    },
    {
      question: "What do I need to get started?",
      answer: context.userFlows[0]?.prerequisites?.length
        ? `You'll need: ${context.userFlows[0].prerequisites.join(', ')}`
        : "You can start using this feature right away, no special requirements needed."
    }
  ];

  // Add data-related FAQ if relevant
  if (patterns.dataOperations.size > 0) {
    faq.push({
      question: "Are my changes saved automatically?",
      answer: "Yes, your changes are saved automatically as you work. You can always see your latest updates in real-time."
    });
  }

  // Add interaction-related FAQ if relevant
  if (patterns.userActions.size > 0) {
    faq.push({
      question: "Can I undo my changes?",
      answer: "Yes, you can review your recent changes and undo them if needed. Your work is always preserved."
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
