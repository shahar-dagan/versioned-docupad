
import { ExtendedFeature, FeatureContext, DocumentationPatterns } from '../types';

const examineCodebase = (feature: ExtendedFeature) => {
  const codeDetails = {
    fileStructure: new Map<string, string[]>(),
    componentRelations: new Map<string, Set<string>>(),
    functionality: new Map<string, string[]>()
  };

  feature.code_changes?.forEach(change => {
    if (!change.file_path) return;

    const pathParts = change.file_path.split('/');
    const category = pathParts[1] || 'root';
    if (!codeDetails.fileStructure.has(category)) {
      codeDetails.fileStructure.set(category, []);
    }
    codeDetails.fileStructure.get(category)?.push(change.file_path);

    if (change.change_description) {
      const relatedFiles = findRelatedFiles(change.change_description, feature.code_changes || []);
      codeDetails.componentRelations.set(change.file_path, new Set(relatedFiles));
    }

    const functionType = determineFunctionType(change);
    if (!codeDetails.functionality.has(functionType)) {
      codeDetails.functionality.set(functionType, []);
    }
    codeDetails.functionality.get(functionType)?.push(change.change_description || '');
  });

  return codeDetails;
};

const summarizeFunctionalities = (codeDetails: ReturnType<typeof examineCodebase>) => {
  const summary = {
    features: new Set<string>(),
    dependencies: new Map<string, Set<string>>(),
    components: new Set<string>()
  };

  codeDetails.functionality.forEach((descriptions, type) => {
    descriptions.forEach(desc => {
      if (desc) summary.features.add(`${type}: ${desc}`);
    });
  });

  codeDetails.componentRelations.forEach((related, file) => {
    summary.dependencies.set(file, related);
  });

  codeDetails.fileStructure.forEach((files, category) => {
    files.forEach(file => {
      if (file.includes('component')) {
        summary.components.add(file);
      }
    });
  });

  return summary;
};

const identifyUserFeatures = (
  summary: ReturnType<typeof summarizeFunctionalities>,
  feature: ExtendedFeature
): FeatureContext => {
  const userFlows = new Set<string>();
  const interactions = new Set<string>();
  const prerequisites = new Set<string>();

  summary.components.forEach(component => {
    const interaction = extractUserInteraction(component);
    if (interaction) interactions.add(interaction);
  });

  summary.features.forEach(featureDesc => {
    const flow = extractUserFlow(featureDesc);
    if (flow) userFlows.add(flow);
  });

  summary.dependencies.forEach((deps) => {
    deps.forEach(dep => {
      if (dep.includes('auth')) prerequisites.add('Authentication');
      if (dep.includes('permission')) prerequisites.add('Required Permissions');
    });
  });

  return {
    mainFeature: feature.name || 'Product Features',
    subFeature: Array.from(userFlows)[0] || '',
    userFlows: Array.from(userFlows).map(flow => ({
      action: flow,
      steps: generateStepsForFlow(flow),
      expectedOutcome: `Successfully completed ${flow.toLowerCase()}`,
      prerequisites: Array.from(prerequisites)
    })),
    relatedFeatures: Array.from(interactions)
  };
};

const craftFeatureDescriptions = (
  context: FeatureContext,
  patterns: DocumentationPatterns
) => {
  const descriptions = new Map<string, {
    title: string;
    explanation: string;
    example: string;
  }>();

  context.userFlows.forEach(flow => {
    const title = formatUserFriendlyTitle(flow.action);
    const explanation = generateUserFriendlyExplanation(flow);
    const example = generatePracticalExample(flow, patterns);

    descriptions.set(flow.action, {
      title,
      explanation,
      example
    });
  });

  return descriptions;
};

const findRelatedFiles = (description: string, changes: ExtendedFeature['code_changes']): string[] => {
  return changes
    .filter(change => change.change_description?.toLowerCase()
      .includes(description.toLowerCase()))
    .map(change => change.file_path || '')
    .filter(Boolean);
};

const determineFunctionType = (change: ExtendedFeature['code_changes'][0]): string => {
  const desc = change.change_description?.toLowerCase() || '';
  if (desc.includes('create')) return 'Creation';
  if (desc.includes('update')) return 'Modification';
  if (desc.includes('delete')) return 'Deletion';
  if (desc.includes('view')) return 'Viewing';
  if (desc.includes('auth')) return 'Authentication';
  return 'General';
};

const extractUserInteraction = (component: string): string => {
  const interactions: Record<string, string> = {
    'form': 'Data Input',
    'button': 'User Action',
    'list': 'Data Display',
    'modal': 'Interactive Dialog',
    'nav': 'Navigation',
    'table': 'Data Grid'
  };

  for (const [key, value] of Object.entries(interactions)) {
    if (component.toLowerCase().includes(key)) {
      return value;
    }
  }
  return '';
};

const extractUserFlow = (featureDesc: string): string => {
  const [type, desc] = featureDesc.split(': ');
  if (!desc) return '';
  return desc.charAt(0).toUpperCase() + desc.slice(1);
};

const generateStepsForFlow = (flow: string): string[] => {
  const steps: string[] = [];
  const lowercaseFlow = flow.toLowerCase();

  if (lowercaseFlow.includes('create')) {
    steps.push('Click the create button');
    steps.push('Fill in the required information');
    steps.push('Save your changes');
  } else if (lowercaseFlow.includes('update')) {
    steps.push('Select the item to modify');
    steps.push('Make your desired changes');
    steps.push('Save the updates');
  } else if (lowercaseFlow.includes('delete')) {
    steps.push('Select the item to remove');
    steps.push('Confirm the deletion');
  } else {
    steps.push('Navigate to the appropriate section');
    steps.push('Select your desired action');
    steps.push('Follow the on-screen instructions');
  }

  return steps;
};

const formatUserFriendlyTitle = (action: string): string => {
  return action.split(/(?=[A-Z])/).join(' ');
};

const generateUserFriendlyExplanation = (flow: FeatureContext['userFlows'][0]): string => {
  return `This feature allows you to ${flow.action.toLowerCase()}. ${
    flow.prerequisites.length > 0 
      ? `You'll need ${flow.prerequisites.join(' and ')} to use this feature.`
      : ''
  }`;
};

const generatePracticalExample = (
  flow: FeatureContext['userFlows'][0],
  patterns: DocumentationPatterns
): string => {
  const action = flow.action.toLowerCase();
  const components = Array.from(patterns.uiComponents);
  const inputs = Array.from(patterns.userInputs);

  return `For example, you can ${action} using ${
    components.length > 0 
      ? `the ${components[0].toLowerCase()}`
      : 'this feature'
  }${
    inputs.length > 0 
      ? ` by providing ${inputs[0].toLowerCase()}`
      : ''
  }.`;
};

export const identifyFeatureContext = (feature: ExtendedFeature): FeatureContext => {
  const codeDetails = examineCodebase(feature);
  const summary = summarizeFunctionalities(codeDetails);
  return identifyUserFeatures(summary, feature);
};

export const analyzeCodeChanges = (changes: ExtendedFeature['code_changes']): DocumentationPatterns => {
  const patterns: DocumentationPatterns = {
    userInputs: new Set<string>(),
    userActions: new Set<string>(),
    dataOperations: new Set<string>(),
    uiComponents: new Set<string>()
  };

  changes?.forEach(change => {
    const description = change.change_description?.toLowerCase() || '';
    const path = change.file_path?.toLowerCase() || '';

    // Detect user inputs from file paths and descriptions
    if (path.includes('form') || path.includes('input')) {
      patterns.userInputs.add(extractInputType(path));
    }

    // Detect user actions from change descriptions
    if (description) {
      patterns.userActions.add(change.change_description);
    }

    // Detect data operations
    if (description.includes('save') || description.includes('update') || description.includes('delete')) {
      patterns.dataOperations.add(change.change_description);
    }

    // Detect UI components from file paths
    if (path.includes('component')) {
      patterns.uiComponents.add(extractComponentName(path));
    }
  });

  return patterns;
};

const extractInputType = (path: string): string => {
  const matches = path.match(/(?:form|input)\/([^/]+)/i);
  return matches ? matches[1].replace(/-/g, ' ') : 'Form input';
};

const extractComponentName = (path: string): string => {
  const matches = path.match(/components\/([^/]+)/i);
  return matches ? matches[1].replace(/-/g, ' ') : 'UI Component';
};
