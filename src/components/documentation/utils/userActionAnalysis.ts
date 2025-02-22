
import { ExtendedFeature } from '../types';

interface UserAction {
  type: 'view' | 'create' | 'edit' | 'delete' | 'navigate' | 'submit' | 'interact';
  description: string;
  location: string;
  prerequisites?: string[];
  relatedActions?: string[];
}

interface ActionableFeature {
  name: string;
  description: string;
  path?: string;
  actions: UserAction[];
  requiredAuth?: boolean;
}

// Patterns to identify user actions
const actionPatterns = {
  create: ['create', 'add', 'new', 'insert'],
  edit: ['edit', 'update', 'modify', 'change'],
  delete: ['delete', 'remove', 'archive'],
  view: ['view', 'display', 'show', 'list'],
  submit: ['submit', 'send', 'save'],
  interact: ['click', 'select', 'choose']
};

const determineActionType = (content: string): 'view' | 'create' | 'edit' | 'delete' | 'navigate' | 'submit' | 'interact' => {
  const lowerContent = content.toLowerCase();
  
  for (const [key, patterns] of Object.entries(actionPatterns)) {
    if (patterns.some(pattern => lowerContent.includes(pattern))) {
      return key as any;
    }
  }
  
  return 'interact';
};

const extractUserActions = (fileContent: string, filePath: string): UserAction[] => {
  const actions: UserAction[] = [];

  // Find event handlers
  const eventHandlerPattern = /on[A-Z]\w+={([^}]+)}/g;
  const eventMatches = fileContent.matchAll(eventHandlerPattern);
  
  for (const match of Array.from(eventMatches)) {
    if (match[1]) {
      const handlerName = match[1].trim();
      actions.push({
        type: determineActionType(handlerName),
        description: handlerName.split(/(?=[A-Z])/).join(' ').toLowerCase(),
        location: filePath,
      });
    }
  }

  // Find form submissions
  const formPattern = /<form[^>]*onSubmit={([^}]+)}/g;
  const formMatches = fileContent.matchAll(formPattern);
  
  for (const match of Array.from(formMatches)) {
    if (match[1]) {
      actions.push({
        type: 'submit',
        description: `Submit form: ${match[1].trim()}`,
        location: filePath,
      });
    }
  }

  // Find navigation links
  const linkPattern = /<Link[^>]*to=["']([^"']+)["'][^>]*>/g;
  const linkMatches = fileContent.matchAll(linkPattern);
  
  for (const match of Array.from(linkMatches)) {
    if (match[1]) {
      actions.push({
        type: 'navigate',
        description: `Navigate to ${match[1]}`,
        location: filePath,
      });
    }
  }

  return actions;
};

const analyzeRouteProtection = (fileContent: string): boolean => {
  return fileContent.includes('PrivateRoute') || 
         fileContent.includes('RequireAuth') || 
         fileContent.includes('isAuthenticated');
};

const extractFeatureName = (filePath: string): string => {
  const parts = filePath.split('/');
  const fileName = parts[parts.length - 1].replace(/\.[^/.]+$/, '');
  return fileName.split(/(?=[A-Z])/).join(' ').trim();
};

const identifyRelatedActions = (actions: UserAction[]): UserAction[] => {
  return actions.map(action => ({
    ...action,
    relatedActions: actions
      .filter(a => a.location === action.location && a !== action)
      .map(a => a.description)
  }));
};

const groupActionsByFeature = (actions: UserAction[], filePaths: string[]): ActionableFeature[] => {
  const featureMap = new Map<string, ActionableFeature>();

  filePaths.forEach(filePath => {
    const featureName = extractFeatureName(filePath);
    const featureActions = actions.filter(action => action.location === filePath);
    
    if (featureActions.length > 0) {
      featureMap.set(filePath, {
        name: featureName,
        description: `Manage ${featureName.toLowerCase()}`,
        path: filePath,
        actions: identifyRelatedActions(featureActions),
        requiredAuth: analyzeRouteProtection(filePath)
      });
    }
  });

  return Array.from(featureMap.values());
};

export const analyzeUserActions = async (feature: ExtendedFeature): Promise<ActionableFeature[]> => {
  const allActions: UserAction[] = [];
  const filePaths: string[] = [];

  // Analyze each code change
  feature.code_changes?.forEach(change => {
    if (change?.content && change.file_path) {
      // Skip configuration, test, and utility files
      if (
        !change.file_path.includes('test') &&
        !change.file_path.includes('config') &&
        !change.file_path.includes('utils') &&
        !change.file_path.includes('.d.ts')
      ) {
        const actions = extractUserActions(change.content, change.file_path);
        allActions.push(...actions);
        filePaths.push(change.file_path);
      }
    }
  });

  return groupActionsByFeature(allActions, filePaths);
};
