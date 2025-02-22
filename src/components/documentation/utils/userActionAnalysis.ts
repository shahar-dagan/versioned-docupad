
import { ExtendedFeature } from '../types';

interface UserAction {
  type: 'view' | 'create' | 'edit' | 'delete' | 'navigate' | 'submit' | 'interact';
  description: string;
  category: string;
  componentName?: string;
}

interface ActionableFeature {
  category: string;
  description: string;
  actions: UserAction[];
  subFeatures: ActionableFeature[];
}

const analyzeAuthFeatures = (content: string): UserAction[] => {
  const actions: UserAction[] = [];
  
  if (content.includes('auth.signIn')) {
    actions.push({
      type: 'submit',
      description: 'Sign in with email',
      category: 'Authentication & User Management'
    });
  }
  
  if (content.includes('auth.signUp')) {
    actions.push({
      type: 'create',
      description: 'Sign up with email',
      category: 'Authentication & User Management'
    });
  }

  if (content.includes('profile') || content.includes('user.id')) {
    actions.push({
      type: 'view',
      description: 'Manage profile',
      category: 'Authentication & User Management'
    });
  }

  return actions;
};

const analyzeProductFeatures = (content: string): UserAction[] => {
  const actions: UserAction[] = [];
  
  if (content.includes('products')) {
    // Product management actions
    if (content.includes('insert') || content.includes('createProduct')) {
      actions.push({
        type: 'create',
        description: 'Create new products',
        category: 'Product Management'
      });
    }
    
    if (content.includes('delete')) {
      actions.push({
        type: 'delete',
        description: 'Delete existing products',
        category: 'Product Management'
      });
    }
    
    if (content.includes('select') || content.match(/products\s*\(/)) {
      actions.push({
        type: 'view',
        description: 'View product list',
        category: 'Product Management'
      });
    }

    // Look for description fields
    if (content.includes('description')) {
      actions.push({
        type: 'edit',
        description: 'Add descriptions to products',
        category: 'Product Management'
      });
    }
  }

  return actions;
};

const analyzeRepositoryFeatures = (content: string): UserAction[] => {
  const actions: UserAction[] = [];

  if (content.includes('github') || content.includes('repository')) {
    if (content.includes('link') || content.includes('connect')) {
      actions.push({
        type: 'create',
        description: 'Link GitHub repositories',
        category: 'Repository Integration'
      });
    }

    if (content.includes('analyze')) {
      actions.push({
        type: 'interact',
        description: 'Analyze repository code',
        category: 'Repository Integration'
      });
    }

    if (content.includes('changes') || content.includes('history')) {
      actions.push({
        type: 'view',
        description: 'Track code changes',
        category: 'Repository Integration'
      });
    }
  }

  return actions;
};

const analyzeFeatureTracking = (content: string): UserAction[] => {
  const actions: UserAction[] = [];

  if (content.includes('features')) {
    if (content.includes('insert') || content.includes('create')) {
      actions.push({
        type: 'create',
        description: 'Add features to products',
        category: 'Feature Tracking'
      });
    }

    if (content.includes('select') || content.match(/features\s*\(/)) {
      actions.push({
        type: 'view',
        description: 'View features list',
        category: 'Feature Tracking'
      });
    }

    if (content.includes('status')) {
      actions.push({
        type: 'edit',
        description: 'Track feature status',
        category: 'Feature Tracking'
      });
    }
  }

  return actions;
};

const analyzeDocumentation = (content: string): UserAction[] => {
  const actions: UserAction[] = [];

  if (content.includes('documentation') || content.includes('docs')) {
    actions.push({
      type: 'view',
      description: 'View auto-generated documentation',
      category: 'Documentation'
    });

    if (content.includes('search')) {
      actions.push({
        type: 'interact',
        description: 'Search documentation',
        category: 'Documentation'
      });
    }

    if (content.includes('technical')) {
      actions.push({
        type: 'view',
        description: 'View technical documentation',
        category: 'Documentation'
      });
    }
  }

  return actions;
};

const analyzeTeamCollaboration = (content: string): UserAction[] => {
  const actions: UserAction[] = [];

  if (content.includes('team') || content.includes('member')) {
    actions.push({
      type: 'view',
      description: 'View team members',
      category: 'Team Collaboration'
    });
  }

  if (content.includes('stats') || content.includes('analytics')) {
    actions.push({
      type: 'view',
      description: 'See project statistics',
      category: 'Team Collaboration'
    });
  }

  return actions;
};

const categorizeFeatures = (actions: UserAction[]): ActionableFeature[] => {
  const categoryMap = new Map<string, ActionableFeature>();

  actions.forEach(action => {
    if (!categoryMap.has(action.category)) {
      categoryMap.set(action.category, {
        category: action.category,
        description: `Manage ${action.category.toLowerCase()}`,
        actions: [],
        subFeatures: []
      });
    }
    
    const category = categoryMap.get(action.category);
    if (category && !category.actions.find(a => a.description === action.description)) {
      category.actions.push(action);
    }
  });

  return Array.from(categoryMap.values());
};

export const analyzeUserActions = async (feature: ExtendedFeature): Promise<ActionableFeature[]> => {
  const allActions: UserAction[] = [];

  // Analyze each file for different types of features
  feature.code_changes?.forEach(change => {
    if (!change?.content) return;

    // Skip non-relevant files
    if (
      !change.file_path.includes('test') &&
      !change.file_path.includes('config') &&
      !change.file_path.includes('.d.ts') &&
      !change.file_path.includes('.css')
    ) {
      // Collect all actions from different analyzers
      allActions.push(
        ...analyzeAuthFeatures(change.content),
        ...analyzeProductFeatures(change.content),
        ...analyzeRepositoryFeatures(change.content),
        ...analyzeFeatureTracking(change.content),
        ...analyzeDocumentation(change.content),
        ...analyzeTeamCollaboration(change.content)
      );
    }
  });

  // Remove duplicate actions and categorize them
  return categorizeFeatures(allActions);
};
