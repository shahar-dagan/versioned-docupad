
import { ExtendedFeature, FeatureContext, DocumentationPatterns, UserDocs } from '../types';

const analyzeFeature = (feature: ExtendedFeature): string[] => {
  // Step 1: Examine the Code - Dynamic Analysis
  const codeAnalysis = {
    components: feature.code_changes?.map(change => change.file_path) || [],
    changeTypes: feature.code_changes?.map(change => change.change_type) || [],
    descriptions: feature.code_changes?.map(change => change.change_description) || []
  };

  // Step 2: List Overall Functionalities - Pattern Detection
  const functionalityPatterns = new Set<string>();
  codeAnalysis.descriptions.forEach(desc => {
    if (desc?.toLowerCase().includes('create')) functionalityPatterns.add('Creation capabilities');
    if (desc?.toLowerCase().includes('update')) functionalityPatterns.add('Update functionality');
    if (desc?.toLowerCase().includes('delete')) functionalityPatterns.add('Deletion capabilities');
    if (desc?.toLowerCase().includes('view')) functionalityPatterns.add('View functionality');
    // Add more patterns as needed
  });

  // Step 3: Identify User-Facing Features
  const userInteractions = new Set<string>();
  codeAnalysis.components.forEach(component => {
    if (component?.includes('page')) userInteractions.add('Page navigation');
    if (component?.includes('form')) userInteractions.add('Data input');
    if (component?.includes('list')) userInteractions.add('Data viewing');
    if (component?.includes('button')) userInteractions.add('User actions');
    // Add more component analysis as needed
  });

  return Array.from(new Set([
    ...Array.from(functionalityPatterns),
    ...Array.from(userInteractions)
  ]));
};

const createUserFriendlyGuides = (feature: ExtendedFeature) => {
  // Step 4: Dynamic Guide Generation based on Feature Analysis
  const guides: Record<string, {
    title: string;
    explanation: string;
    realLifeExample: string;
  }> = {};

  // Analyze feature properties to generate guides
  if (feature.name) {
    guides[feature.name] = {
      title: feature.name,
      explanation: feature.description || `Functionality for ${feature.name}`,
      realLifeExample: `Use this when working with ${feature.name.toLowerCase()}`
    };
  }

  // Analyze code changes to detect feature purposes
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

// Helper functions for dynamic guide generation
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
