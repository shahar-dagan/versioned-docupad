
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

  // Map file paths to user-centric features
  if (paths.some(p => p.includes('auth'))) {
    context.mainFeature = 'User Management';
    if (paths.some(p => p.includes('signup'))) {
      context.subFeature = 'Account Creation';
      context.relatedFeatures = ['Profile Setup', 'Email Verification', 'Login'];
    } else if (paths.some(p => p.includes('login'))) {
      context.subFeature = 'Authentication';
      context.relatedFeatures = ['Password Reset', 'Remember Me', 'Profile Access'];
    } else {
      context.subFeature = 'User Settings';
      context.relatedFeatures = ['Profile Management', 'Security Settings', 'Notifications'];
    }
  } else if (paths.some(p => p.includes('documentation'))) {
    context.mainFeature = 'Documentation Center';
    if (paths.some(p => p.includes('generator'))) {
      context.subFeature = 'Documentation Creation';
      context.relatedFeatures = ['Template Selection', 'Content Organization', 'Publishing'];
    } else {
      context.subFeature = 'Documentation Browser';
      context.relatedFeatures = ['Search Documentation', 'Quick Navigation', 'Version History'];
    }
  } else if (paths.some(p => p.includes('features'))) {
    context.mainFeature = 'Feature Management';
    context.subFeature = 'Feature Workspace';
    context.relatedFeatures = ['Feature Planning', 'Documentation', 'Change Tracking'];
  }

  // Extract user flows from descriptions and add common interactions
  const userFlows = descriptions
    .filter(Boolean)
    .filter(desc => desc?.toLowerCase().includes('user can'))
    .map(desc => {
      const action = desc!.replace('User can', '').trim();
      const flow = {
        action,
        steps: [],
        expectedOutcome: `Successfully ${action.toLowerCase()}`,
        prerequisites: [] as string[]
      };

      // Add common user interaction patterns based on feature type
      if (context.mainFeature === 'User Management') {
        flow.prerequisites = [
          'Valid email address',
          'Password meeting security requirements',
          'Acceptance of terms and conditions'
        ];
        flow.steps = [
          'Navigate to the user management section',
          `Select the ${context.subFeature.toLowerCase()} option`,
          'Fill in required information',
          'Submit and verify the action'
        ];
      } else if (context.mainFeature === 'Documentation Center') {
        flow.prerequisites = [
          'Active user session',
          'Proper access permissions',
          'Selected documentation target'
        ];
        flow.steps = [
          'Access the documentation center',
          `Choose ${context.subFeature.toLowerCase()} option`,
          'Select or create content',
          'Preview and confirm changes'
        ];
      }

      return flow;
    });

  context.userFlows = userFlows;

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
    // Map UI components to user interaction points
    if (change.file_path.includes('components')) {
      const component = change.file_path.split('/').pop() || '';
      patterns.uiComponents.add(component);
      
      // Identify common user input patterns
      if (component.toLowerCase().includes('form')) {
        patterns.userInputs.add('Form submission');
      } else if (component.toLowerCase().includes('button')) {
        patterns.userActions.add('Button interaction');
      } else if (component.toLowerCase().includes('modal')) {
        patterns.userActions.add('Modal interaction');
      }
    }

    // Map change descriptions to user actions
    if (change.change_description.toLowerCase().includes('user can')) {
      patterns.userActions.add(change.change_description);
    }

    // Identify data-related user interactions
    if (change.change_description.toLowerCase().includes('data')) {
      patterns.dataOperations.add('Data modification');
      patterns.userActions.add('Save changes');
      patterns.userActions.add('View updated content');
    }
  });

  return patterns;
};
