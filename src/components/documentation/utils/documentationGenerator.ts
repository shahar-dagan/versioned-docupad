
import { ExtendedFeature, FeatureContext, DocumentationPatterns, UserDocs } from '../types';

export const generateOverview = (feature: ExtendedFeature, context: FeatureContext): string => {
  return `${feature.name} is part of the ${context.mainFeature} system, specifically handling ${context.subFeature}. ` +
         `This feature provides a user-friendly way to ${feature.description?.toLowerCase() || ''}. ` +
         `It's commonly used alongside ${context.relatedFeatures.join(', ')}.`;
};

export const generateSteps = (userFlows: FeatureContext['userFlows']): string[] => {
  const steps: string[] = [];
  userFlows.forEach(flow => {
    if (flow.prerequisites) {
      steps.push(`Before ${flow.action}, ensure you have: ${flow.prerequisites.join(', ')}`);
    }
    steps.push(`To ${flow.action}:`);
    flow.steps.forEach(step => steps.push(step));
  });
  return steps;
};

export const generateUseCases = (context: FeatureContext): string[] => {
  return context.userFlows.map(flow => 
    `Use this feature when you need to ${flow.action.toLowerCase()}`
  );
};

export const generateFAQ = (context: FeatureContext, patterns: DocumentationPatterns): Array<{ question: string; answer: string }> => {
  const faq: Array<{ question: string; answer: string }> = [];
  
  faq.push({
    question: `How does this feature fit into the ${context.mainFeature} system?`,
    answer: `This feature is a key part of ${context.subFeature}, helping users to ${context.userFlows[0]?.action.toLowerCase() || 'perform actions'} within the ${context.mainFeature} system.`
  });

  if (context.relatedFeatures.length > 0) {
    faq.push({
      question: "What other features should I know about?",
      answer: `This feature works well with ${context.relatedFeatures.join(', ')}. Consider exploring these related features to get the most out of the system.`
    });
  }

  if (patterns.dataOperations.size > 0) {
    faq.push({
      question: "Is my data saved automatically?",
      answer: "Yes, all changes are automatically saved and synchronized with your account.",
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
