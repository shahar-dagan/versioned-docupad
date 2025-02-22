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

const generateUserGuide = (feature: ExtendedFeature, context: FeatureContext): string => {
  const overview = [
    `# Getting Started with ${feature.name}`,
    '',
    `Welcome! This guide will show you how to use ${feature.name} effectively.`,
    '',
    '## Before You Begin',
    ...context.userFlows
      .flatMap(flow => flow.prerequisites || [])
      .map(prereq => `- Make sure you have ${prereq.toLowerCase()}`),
    ''
  ].join('\n');

  const quickStart = [
    '## Quick Start Guide',
    '1. Navigate to the appropriate section in your dashboard',
    '2. Look for the ' + feature.name + ' feature',
    '3. Follow the specific instructions below for your desired action',
    ''
  ].join('\n');

  const mainActions = context.userFlows.map(flow => {
    return [
      `## How to ${flow.action}`,
      '',
      'Follow these steps:',
      '',
      ...flow.steps.map((step, index) => `${index + 1}. ${step}`),
      '',
      'Expected outcome:',
      `- ${flow.expectedOutcome}`,
      '',
      flow.prerequisites?.length ? [
        'Required:',
        ...flow.prerequisites.map(prereq => `- ${prereq}`),
        ''
      ].join('\n') : '',
    ].join('\n');
  }).join('\n');

  return [overview, quickStart, mainActions].join('\n');
};

const generateSteps = (userFlows: FeatureContext['userFlows']): string[] => {
  let allSteps: string[] = [];
  
  allSteps.push('Open the application dashboard');
  allSteps.push('Navigate to the features section');
  
  userFlows.forEach(flow => {
    allSteps.push(`\nTo ${flow.action}:`);
    
    if (flow.prerequisites?.length) {
      allSteps.push('Prerequisites:');
      flow.prerequisites.forEach(prereq => {
        allSteps.push(`- Ensure you have ${prereq.toLowerCase()}`);
      });
    }
    
    flow.steps.forEach((step, index) => {
      allSteps.push(`${index + 1}. ${step}`);
    });
    
    allSteps.push(`Once complete: ${flow.expectedOutcome}`);
  });
  
  return allSteps;
};

const generateUseCases = (context: FeatureContext): string[] => {
  const useCases = new Set<string>();
  
  useCases.add('When first setting up the feature');
  
  context.userFlows.forEach(flow => {
    useCases.add(`When you need to ${flow.action.toLowerCase()}`);
    if (flow.expectedOutcome) {
      useCases.add(`When you want to ${flow.expectedOutcome.toLowerCase()}`);
    }
    
    if (flow.prerequisites?.length) {
      useCases.add(`After setting up ${flow.prerequisites.join(' and ')}`);
    }
  });
  
  context.relatedFeatures.forEach(feature => {
    useCases.add(`When working with ${feature.toLowerCase()}`);
  });

  return Array.from(useCases);
};

const generateFAQ = (context: FeatureContext, patterns: DocumentationPatterns): Array<{ question: string; answer: string }> => {
  const faqs: Array<{ question: string; answer: string }> = [
    {
      question: `How do I get started with ${context.mainFeature}?`,
      answer: `First, navigate to your dashboard and locate the ${context.mainFeature} section. From there, you can begin using any of the available features.`
    }
  ];

  context.userFlows.forEach(flow => {
    faqs.push({
      question: `How do I ${flow.action.toLowerCase()}?`,
      answer: flow.steps.join('. ')
    });

    if (flow.prerequisites?.length) {
      faqs.push({
        question: `What do I need before I can ${flow.action.toLowerCase()}?`,
        answer: `Before ${flow.action.toLowerCase()}, ensure you have: ${flow.prerequisites.join(', ')}`
      });
    }

    faqs.push({
      question: `How do I know when I've successfully completed ${flow.action.toLowerCase()}?`,
      answer: flow.expectedOutcome
    });
  });

  if (patterns.userInputs.size > 0) {
    faqs.push({
      question: 'What information do I need to provide?',
      answer: `You'll need to provide: ${Array.from(patterns.userInputs).join(', ')}`
    });
  }

  if (context.relatedFeatures.length > 0) {
    faqs.push({
      question: 'What other features work with this?',
      answer: `This feature works well with: ${context.relatedFeatures.join(', ')}`
    });
  }

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
    overview: generateUserGuide(feature, context),
    steps: generateSteps(context.userFlows),
    use_cases: generateUseCases(context),
    faq: generateFAQ(context, patterns)
  };
};
