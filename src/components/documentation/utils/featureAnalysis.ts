
import { ExtendedFeature, FeatureContext, DocumentationPatterns } from '../types';

export const identifyFeatureContext = (feature: ExtendedFeature): FeatureContext => {
  const userFlows = feature.code_changes?.map(change => ({
    action: change.change_description || 'Using this feature',
    steps: extractStepsFromChange(change),
    expectedOutcome: `Successfully completed ${change.change_description?.toLowerCase() || 'operation'}`,
    prerequisites: extractPrerequisites(change)
  })) || [];

  return {
    mainFeature: feature.name || 'Product Features',
    subFeature: extractSubFeature(feature),
    userFlows: userFlows.length > 0 ? userFlows : [],
    relatedFeatures: extractRelatedFeatures(feature)
  };
};

const extractStepsFromChange = (change: ExtendedFeature['code_changes'][0]): string[] => {
  const description = change.change_description?.toLowerCase() || '';
  const filePath = change.file_path?.toLowerCase() || '';
  
  const steps: string[] = [];
  
  if (filePath.includes('page')) {
    steps.push('Navigate to the appropriate section');
  }
  
  if (description.includes('create') || description.includes('add')) {
    steps.push('Click the add/create button');
    steps.push('Fill in required information');
    steps.push('Save your changes');
  }
  
  if (description.includes('edit') || description.includes('update')) {
    steps.push('Select the item to modify');
    steps.push('Make your changes');
    steps.push('Save updates');
  }
  
  if (description.includes('delete') || description.includes('remove')) {
    steps.push('Select the item to remove');
    steps.push('Confirm deletion');
  }
  
  return steps.length > 0 ? steps : ['Navigate to the feature', 'Review available options', 'Take desired action'];
};

const extractPrerequisites = (change: ExtendedFeature['code_changes'][0]): string[] => {
  const prerequisites: Set<string> = new Set();
  
  if (change.file_path?.includes('auth')) {
    prerequisites.add('User authentication');
  }
  
  if (change.change_description?.includes('permission')) {
    prerequisites.add('Required permissions');
  }
  
  return Array.from(prerequisites);
};

const extractSubFeature = (feature: ExtendedFeature): string => {
  return feature.code_changes?.[0]?.change_description || 'Feature Management';
};

const extractRelatedFeatures = (feature: ExtendedFeature): string[] => {
  const related = new Set<string>();
  
  feature.code_changes?.forEach(change => {
    const path = change.file_path?.toLowerCase() || '';
    if (path.includes('auth')) related.add('Authentication');
    if (path.includes('user')) related.add('User Management');
    if (path.includes('doc')) related.add('Documentation');
    if (path.includes('change')) related.add('Change Tracking');
  });
  
  return Array.from(related);
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
