
import { ExtendedFeature, FeatureContext, DocumentationPatterns } from '../types';

export const identifyFeatureContext = (feature: ExtendedFeature): FeatureContext => {
  // Main user interaction flow
  const mainFlow = {
    action: 'Using this feature',
    steps: [
      'Navigate to the feature in your product',
      'Review the available options',
      'Make desired changes',
      'Save and confirm your updates'
    ],
    expectedOutcome: 'Successfully updated feature settings',
    prerequisites: [
      'Product access',
      'Required permissions'
    ]
  };

  // Secondary flows based on feature type
  const configFlow = {
    action: 'Configuring settings',
    steps: [
      'Access feature settings',
      'Modify configuration options',
      'Preview changes',
      'Apply and save settings'
    ],
    expectedOutcome: 'Feature configured successfully',
    prerequisites: ['Feature access permissions']
  };

  const docFlow = {
    action: 'Managing documentation',
    steps: [
      'View current documentation',
      'Generate new documentation',
      'Review and edit content',
      'Publish updates'
    ],
    expectedOutcome: 'Documentation updated successfully',
    prerequisites: ['Documentation access']
  };

  return {
    mainFeature: 'Product Features',
    subFeature: feature.name || 'Feature Management',
    userFlows: [mainFlow, configFlow, docFlow],
    relatedFeatures: [
      'Documentation Management',
      'Change Tracking',
      'Team Collaboration'
    ]
  };
};

export const analyzeCodeChanges = (changes: ExtendedFeature['code_changes']): DocumentationPatterns => {
  const patterns: DocumentationPatterns = {
    userInputs: new Set<string>([
      'Feature name',
      'Feature description',
      'Configuration settings',
      'Documentation content'
    ]),
    userActions: new Set<string>([
      'Create feature',
      'Edit feature',
      'Generate documentation',
      'View changes',
      'Update settings'
    ]),
    dataOperations: new Set<string>([
      'Save feature',
      'Update documentation',
      'Track changes'
    ]),
    uiComponents: new Set<string>([
      'Feature form',
      'Documentation viewer',
      'Settings panel'
    ])
  };

  // Add specific patterns from code changes
  changes?.forEach(change => {
    if (change.change_description) {
      patterns.userActions.add(change.change_description);
    }
  });

  return patterns;
};
