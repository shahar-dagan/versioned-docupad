import { ExtendedFeature, FeatureContext, DocumentationPatterns, UserDocs } from '../types';

const analyzeFeature = (feature: ExtendedFeature): string[] => {
  const codeAnalysis = {
    components: feature.code_changes?.map(change => change.file_path) || [],
    changeTypes: feature.code_changes?.map(change => change.change_type) || [],
    descriptions: feature.code_changes?.map(change => change.change_description) || []
  };

  const functionalityPatterns = new Set<string>();
  codeAnalysis.descriptions.forEach(desc => {
    if (!desc) return;
    const words = desc.toLowerCase().split(' ');
    words.forEach(word => {
      if (['create', 'update', 'delete', 'view', 'manage', 'track'].includes(word)) {
        functionalityPatterns.add(`${word.charAt(0).toUpperCase() + word.slice(1)} functionality`);
      }
    });
  });

  const userInteractions = new Set<string>();
  codeAnalysis.components.forEach(component => {
    if (!component) return;
    const componentTypes = {
      'page': 'Page navigation',
      'form': 'Data input',
      'list': 'Data viewing',
      'button': 'User actions',
      'table': 'Data display',
      'modal': 'Interactive dialogs',
      'nav': 'Navigation'
    };

    Object.entries(componentTypes).forEach(([key, value]) => {
      if (component.toLowerCase().includes(key)) {
        userInteractions.add(value);
      }
    });
  });

  return Array.from(new Set([
    ...Array.from(functionalityPatterns),
    ...Array.from(userInteractions)
  ]));
};

const createUserFriendlyGuides = (feature: ExtendedFeature) => {
  const guides: Record<string, {
    title: string;
    explanation: string;
    realLifeExample: string;
  }> = {};

  if (feature.name) {
    guides[feature.name] = {
      title: feature.name,
      explanation: feature.description || `Functionality for ${feature.name}`,
      realLifeExample: `Use this when working with ${feature.name.toLowerCase()}`
    };
  }

  feature.code_changes?.forEach(change => {
    const category = detectFeatureCategory(change.change_description);
    if (category && !guides[category]) {
      guides[category] = {
        title: formatTitle(category),
        explanation: generateExplanation(category, change),
        realLifeExample: generateExample(category, change)
      };
    }
  });

  return guides;
};

const detectFeatureCategory = (description: string): string | null => {
  const categories = {
    'documentation': ['doc', 'documentation', 'guide'],
    'management': ['manage', 'control', 'organize'],
    'integration': ['connect', 'integrate', 'link'],
    'tracking': ['track', 'monitor', 'observe']
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => description?.toLowerCase().includes(keyword))) {
      return category;
    }
  }
  return null;
};

const formatTitle = (category: string): string => {
  return category.charAt(0).toUpperCase() + category.slice(1) + ' System';
};

const generateExplanation = (category: string, change: ExtendedFeature['code_changes'][0]): string => {
  return `Tools and features for ${category.toLowerCase()} management and control`;
};

const generateExample = (category: string, change: ExtendedFeature['code_changes'][0]): string => {
  return `When you need to ${category.toLowerCase()} in your project`;
};

const generateSteps = (userFlows: FeatureContext['userFlows']): string[] => {
  return userFlows.flatMap(flow => [
    `\n${flow.action}:`,
    ...flow.steps.map((step, i) => `${i + 1}. ${step}`)
  ]);
};

const generateUseCases = (context: FeatureContext): string[] => {
  const useCases = new Set<string>();
  
  context.userFlows.forEach(flow => {
    useCases.add(`When you need to ${flow.action.toLowerCase()}`);
    if (flow.expectedOutcome) {
      useCases.add(`When you want to ${flow.expectedOutcome.toLowerCase()}`);
    }
  });

  return Array.from(useCases);
};

const generateFAQ = (context: FeatureContext, patterns: DocumentationPatterns): Array<{ question: string; answer: string }> => {
  const faqs: Array<{ question: string; answer: string }> = [];

  context.userFlows.forEach(flow => {
    faqs.push({
      question: `How do I ${flow.action.toLowerCase()}?`,
      answer: flow.steps.join('. ')
    });
  });

  context.userFlows.forEach(flow => {
    if (flow.prerequisites?.length) {
      faqs.push({
        question: `What do I need before I can ${flow.action.toLowerCase()}?`,
        answer: `You need: ${flow.prerequisites.join(', ')}`
      });
    }
  });

  return faqs;
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

export const generateDocumentation = (feature: ExtendedFeature, context: FeatureContext, patterns: DocumentationPatterns): UserDocs => {
  return {
    overview: generateOverview(feature, context),
    steps: generateSteps(context.userFlows),
    use_cases: generateUseCases(context),
    faq: generateFAQ(context, patterns),
  };
};
