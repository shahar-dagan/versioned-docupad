
import { ExtendedFeature } from '../types';
import { routes } from '@/App';

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

interface RouteMetadata {
  path: string;
  component: string;
}

const analyzeProductManagement = (content: string): UserAction[] => {
  const actions: UserAction[] = [];
  
  // Look for form submissions and mutations
  if (content.includes('createProduct') || content.includes('handleCreateProduct')) {
    actions.push({
      type: 'create',
      description: 'Create new products',
      category: 'Product Management'
    });
  }

  // Look for delete mutations
  if (content.includes('handleDeleteProduct') || content.includes('onDelete={')) {
    actions.push({
      type: 'delete',
      description: 'Delete existing products',
      category: 'Product Management'
    });
  }

  // Look for product listings and views
  if (content.includes('<ProductCard') || content.includes('ProductsList')) {
    actions.push({
      type: 'view',
      description: 'View product list',
      category: 'Product Management'
    });
  }

  // Look for repository linking UI
  if (content.includes('linkRepoMutation') || content.includes('useRepositoryLink')) {
    actions.push({
      type: 'create',
      description: 'Link GitHub repositories to products',
      category: 'Product Management'
    });
  }

  return actions;
};

const analyzeFeatureTracking = (content: string): UserAction[] => {
  const actions: UserAction[] = [];

  // Look for feature creation UI
  if (content.includes('CreateFeatureDialog') || content.includes('handleCreateFeature')) {
    actions.push({
      type: 'create',
      description: 'Add features to products',
      category: 'Feature Tracking'
    });
  }

  // Look for feature list components
  if (content.includes('FeaturesList') || content.includes('features.map')) {
    actions.push({
      type: 'view',
      description: 'View features list for each product',
      category: 'Feature Tracking'
    });
  }

  // Look for status updates
  if (content.includes('status={feature.status}') || content.includes('updateFeatureStatus')) {
    actions.push({
      type: 'edit',
      description: 'Track feature status',
      category: 'Feature Tracking'
    });
  }

  // Look for analysis triggers
  if (content.includes('analyzeRepository') || content.includes('analyzeMutation')) {
    actions.push({
      type: 'interact',
      description: 'Analyze repository for features',
      category: 'Feature Tracking'
    });
  }

  return actions;
};

const analyzeDocumentation = (content: string): UserAction[] => {
  const actions: UserAction[] = [];

  // Look for documentation components
  if (content.includes('DocumentationContent') || content.includes('TechnicalDocumentation')) {
    actions.push({
      type: 'view',
      description: 'View auto-generated documentation',
      category: 'Documentation'
    });

    actions.push({
      type: 'view',
      description: 'View technical documentation',
      category: 'Documentation'
    });
  }

  // Look for navigation components
  if (content.includes('DocumentationNav')) {
    actions.push({
      type: 'navigate',
      description: 'Navigate documentation by feature',
      category: 'Documentation'
    });
  }

  // Look for search functionality
  if (content.includes('DocumentationSearch')) {
    actions.push({
      type: 'interact',
      description: 'Search documentation',
      category: 'Documentation'
    });
  }

  // Look for user documentation
  if (content.includes('UserDocumentation')) {
    actions.push({
      type: 'view',
      description: 'View user documentation',
      category: 'Documentation'
    });
  }

  return actions;
};

const analyzeAuthAndUser = (content: string): UserAction[] => {
  const actions: UserAction[] = [];

  // Look for auth forms and handlers
  if (content.includes('LoginForm') || content.includes('auth.signIn')) {
    actions.push({
      type: 'submit',
      description: 'Sign in with email',
      category: 'Authentication & User Management'
    });
  }

  if (content.includes('SignUpForm') || content.includes('auth.signUp')) {
    actions.push({
      type: 'create',
      description: 'Sign up with email',
      category: 'Authentication & User Management'
    });
  }

  // Look for profile management
  if (content.includes('ProfileMenu') || content.includes('UserProfile')) {
    actions.push({
      type: 'view',
      description: 'Manage profile',
      category: 'Authentication & User Management'
    });
  }

  // Look for dashboard components
  if (content.includes('Dashboard')) {
    actions.push({
      type: 'view',
      description: 'View dashboard',
      category: 'Authentication & User Management'
    });
  }

  return actions;
};

const analyzeRepositoryIntegration = (content: string): UserAction[] => {
  const actions: UserAction[] = [];

  // Look for repository connection UI
  if (content.includes('GitHubRepoSelector') || content.includes('useRepositoryLink')) {
    actions.push({
      type: 'create',
      description: 'Link GitHub repositories',
      category: 'Repository Integration'
    });
  }

  // Look for analysis functionality
  if (content.includes('analyzeRepository') || content.includes('analyze-repository')) {
    actions.push({
      type: 'interact',
      description: 'Analyze repository code',
      category: 'Repository Integration'
    });
  }

  // Look for change tracking
  if (content.includes('Changes') || content.includes('code_changes')) {
    actions.push({
      type: 'view',
      description: 'Track code changes',
      category: 'Repository Integration'
    });
    actions.push({
      type: 'view',
      description: 'View change history',
      category: 'Repository Integration'
    });
  }

  return actions;
};

const analyzeTeamCollaboration = (content: string): UserAction[] => {
  const actions: UserAction[] = [];

  // Look for team components
  if (content.includes('team_members') || content.includes('TeamMembers')) {
    actions.push({
      type: 'view',
      description: 'View team members',
      category: 'Team Collaboration'
    });
  }

  // Look for statistics components
  if (content.includes('DashboardStats') || content.includes('project statistics')) {
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

  feature.code_changes?.forEach(change => {
    if (!change?.content) return;

    // Skip non-relevant files
    if (
      !change.file_path.includes('test') &&
      !change.file_path.includes('config') &&
      !change.file_path.includes('.d.ts') &&
      !change.file_path.includes('.css')
    ) {
      // Analyze based on actual UI components and interactions
      allActions.push(
        ...analyzeProductManagement(change.content),
        ...analyzeFeatureTracking(change.content),
        ...analyzeDocumentation(change.content),
        ...analyzeAuthAndUser(change.content),
        ...analyzeRepositoryIntegration(change.content),
        ...analyzeTeamCollaboration(change.content)
      );
    }
  });

  return categorizeFeatures(allActions);
};
