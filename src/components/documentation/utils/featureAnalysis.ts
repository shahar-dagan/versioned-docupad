
import { ExtendedFeature, FeatureContext, DocumentationPatterns } from '../types';

export const identifyFeatureContext = (feature: ExtendedFeature): FeatureContext => {
  const paths = feature.code_changes?.map(c => c.file_path) || [];
  const descriptions = feature.code_changes?.map(c => c.change_description) || [];
  
  const context: FeatureContext = {
    mainFeature: '',
    subFeature: '',
    userFlows: [],
    relatedFeatures: []
  };

  // Determine main feature category
  if (paths.some(p => p.includes('auth'))) {
    context.mainFeature = 'Authentication';
    context.subFeature = paths.some(p => p.includes('signup')) ? 'Sign Up' : 'Login';
  } else if (paths.some(p => p.includes('documentation'))) {
    context.mainFeature = 'Documentation';
    context.subFeature = paths.some(p => p.includes('generator')) ? 'Documentation Generation' : 'Documentation Viewing';
  } else if (paths.some(p => p.includes('features'))) {
    context.mainFeature = 'Features';
    context.subFeature = 'Feature Management';
  }

  // Identify user flows
  const userFlows = descriptions
    .filter(Boolean)
    .filter(desc => desc?.toLowerCase().includes('user can'))
    .map(desc => ({
      action: desc!.replace('User can', '').trim(),
      steps: [],
      expectedOutcome: `Successfully ${desc!.toLowerCase().replace('user can', '').trim()}`
    }));

  // Add prerequisites for auth-related features
  if (context.mainFeature === 'Authentication') {
    userFlows.forEach(flow => {
      flow.prerequisites = ['Valid email address', 'Password meeting security requirements'];
    });
  }

  context.userFlows = userFlows;
  
  // Identify related features
  if (context.mainFeature === 'Authentication') {
    context.relatedFeatures = ['User Profile', 'Password Reset', 'Session Management'];
  } else if (context.mainFeature === 'Documentation') {
    context.relatedFeatures = ['Feature Analysis', 'Code Change Tracking', 'Documentation Export'];
  }

  return context;
};

export const analyzeCodeChanges = (changes: ExtendedFeature['code_changes']): DocumentationPatterns => {
  const patterns: DocumentationPatterns = {
    userInputs: new Set<string>(),
    userActions: new Set<string>(),
    dataOperations: new Set<string>(),
    uiComponents: new Set<string>(),
  };

  changes?.forEach((change) => {
    if (change.file_path.includes('components')) {
      patterns.uiComponents.add(change.file_path.split('/').pop() || '');
    }

    if (change.change_description.toLowerCase().includes('user can')) {
      patterns.userActions.add(change.change_description);
    }

    if (change.change_description.toLowerCase().includes('data')) {
      patterns.dataOperations.add(change.change_description);
    }
  });

  return patterns;
};
