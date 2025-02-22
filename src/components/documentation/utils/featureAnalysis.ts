
import { ExtendedFeature, FeatureContext, DocumentationPatterns } from '../types';

export const identifyFeatureContext = (feature: ExtendedFeature): FeatureContext => {
  const context: FeatureContext = {
    mainFeature: 'Product Management',
    subFeature: feature.name || 'Product Feature',
    userFlows: [],
    relatedFeatures: ['Feature Planning', 'Documentation', 'Change Tracking']
  };

  // Extract user flows from descriptions or feature purpose
  const baseUserFlow = {
    action: feature.description || 'manage this product feature',
    steps: [
      'Navigate to the Products section',
      'Select the desired product',
      'Configure the feature settings',
      'Save your changes'
    ],
    expectedOutcome: `Successfully ${feature.description?.toLowerCase() || 'configured the feature'}`,
    prerequisites: [
      'Active user account',
      'Access to product management',
      'Required permissions'
    ]
  };

  // Add additional flows based on code changes if available
  const additionalFlows = feature.code_changes
    ?.filter(change => change.change_description?.toLowerCase().includes('user can'))
    .map(change => ({
      action: change.change_description.replace('User can', '').trim(),
      steps: [
        'Access the feature section',
        'Follow the guided workflow',
        'Review and confirm changes'
      ],
      expectedOutcome: `Successfully ${change.change_description.toLowerCase().replace('user can', '').trim()}`,
      prerequisites: ['Feature access permissions']
    })) || [];

  context.userFlows = [baseUserFlow, ...additionalFlows];
  return context;
};

export const analyzeCodeChanges = (changes: ExtendedFeature['code_changes']): DocumentationPatterns => {
  const patterns: DocumentationPatterns = {
    userInputs: new Set<string>(['Product configuration', 'Feature settings']),
    userActions: new Set<string>(['Save changes', 'Configure feature', 'Review settings']),
    dataOperations: new Set<string>(['Update product settings', 'Modify feature configuration']),
    uiComponents: new Set<string>(['Product interface', 'Feature controls'])
  };

  changes?.forEach((change) => {
    // Map changes to user-focused interactions
    if (change.change_description) {
      if (change.change_description.toLowerCase().includes('user can')) {
        patterns.userActions.add(change.change_description.replace('User can', '').trim());
      }
      if (change.change_description.toLowerCase().includes('data')) {
        patterns.dataOperations.add('Save changes');
        patterns.userActions.add('View updated content');
      }
    }

    // Map components to user interaction points
    if (change.file_path.includes('components')) {
      const component = change.file_path.split('/').pop() || '';
      if (component.toLowerCase().includes('form')) {
        patterns.userInputs.add('Configuration form');
      } else if (component.toLowerCase().includes('button')) {
        patterns.userActions.add('Save settings');
      }
    }
  });

  return patterns;
};
