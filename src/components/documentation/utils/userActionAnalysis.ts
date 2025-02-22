
import { ExtendedFeature } from '../types';

interface UserAction {
  type: 'view' | 'create' | 'edit' | 'delete' | 'navigate' | 'submit' | 'interact';
  description: string;
  location: string;
  route?: string;
  componentName?: string;
}

interface ActionableFeature {
  name: string;
  description: string;
  path: string;
  route?: string;
  actions: UserAction[];
  childFeatures?: ActionableFeature[];
  requiredAuth?: boolean;
}

const extractRouteFeatures = (content: string): string[] => {
  const routePattern = /<Route[^>]*path=["']([^"']+)["'][^>]*>/g;
  const matches = Array.from(content.matchAll(routePattern));
  return matches.map(match => match[1]);
};

const extractComponentName = (filePath: string): string => {
  const parts = filePath.split('/');
  const fileName = parts[parts.length - 1].replace(/\.[^/.]+$/, '');
  return fileName;
};

const analyzeUserInteractions = (content: string, filePath: string, route?: string): UserAction[] => {
  const actions: UserAction[] = [];
  const componentName = extractComponentName(filePath);

  // Analyze forms and their submissions
  const formPattern = /<form[^>]*onSubmit={([^}]+)}[^>]*>[\s\S]*?<\/form>/g;
  const formMatches = content.matchAll(formPattern);
  for (const match of Array.from(formMatches)) {
    const formContent = match[0];
    const submitHandler = match[1];
    
    // Extract form purpose from surrounding context
    const formPurpose = formContent.includes('create') ? 'create' :
                       formContent.includes('edit') ? 'edit' :
                       formContent.includes('delete') ? 'delete' : 'submit';
    
    actions.push({
      type: formPurpose as any,
      description: `${formPurpose} ${componentName.toLowerCase()}`,
      location: filePath,
      route,
      componentName
    });
  }

  // Analyze interactive elements (buttons, links)
  const interactionPatterns = [
    /<button[^>]*onClick={([^}]+)}[^>]*>[^<]*<\/button>/g,
    /<Link[^>]*to=["']([^"']+)["'][^>]*>/g,
    /<Button[^>]*onClick={([^}]+)}[^>]*>[^<]*<\/Button>/g
  ];

  for (const pattern of interactionPatterns) {
    const matches = content.matchAll(pattern);
    for (const match of Array.from(matches)) {
      const handler = match[1];
      if (!handler) continue;

      const actionType = 
        content.toLowerCase().includes('delete') ? 'delete' :
        content.toLowerCase().includes('edit') ? 'edit' :
        content.toLowerCase().includes('create') || content.toLowerCase().includes('add') ? 'create' :
        content.toLowerCase().includes('view') ? 'view' :
        'interact';

      const description = handler
        .replace(/[{()}]/g, '')
        .split(/(?=[A-Z])/)
        .join(' ')
        .toLowerCase();

      actions.push({
        type: actionType,
        description,
        location: filePath,
        route,
        componentName
      });
    }
  }

  // Look for data display patterns
  if (content.includes('map(') || content.includes('forEach(')) {
    actions.push({
      type: 'view',
      description: `View ${componentName.toLowerCase()} list`,
      location: filePath,
      route,
      componentName
    });
  }

  // Look for mutation hooks
  const mutationPattern = /useMutation[^)]*\)/g;
  const mutationMatches = content.matchAll(mutationPattern);
  for (const match of Array.from(mutationMatches)) {
    const mutationContent = match[0];
    
    const actionType = 
      mutationContent.toLowerCase().includes('delete') ? 'delete' :
      mutationContent.toLowerCase().includes('update') || mutationContent.toLowerCase().includes('edit') ? 'edit' :
      mutationContent.toLowerCase().includes('create') ? 'create' :
      'submit';

    actions.push({
      type: actionType,
      description: `${actionType} ${componentName.toLowerCase()}`,
      location: filePath,
      route,
      componentName
    });
  }

  // Look for query hooks (view actions)
  const queryPattern = /useQuery[^)]*\)/g;
  const queryMatches = content.matchAll(queryPattern);
  for (const match of Array.from(queryMatches)) {
    actions.push({
      type: 'view',
      description: `View ${componentName.toLowerCase()} data`,
      location: filePath,
      route,
      componentName
    });
  }

  return actions;
};

const buildFeatureHierarchy = (
  actions: UserAction[], 
  routes: string[]
): ActionableFeature[] => {
  const featureMap = new Map<string, ActionableFeature>();

  // Group actions by their component/route context
  actions.forEach(action => {
    const key = action.route || action.location;
    if (!featureMap.has(key)) {
      featureMap.set(key, {
        name: action.componentName || extractComponentName(action.location),
        description: `Manage ${action.componentName?.toLowerCase() || 'feature'}`,
        path: action.location,
        route: action.route,
        actions: [],
        childFeatures: []
      });
    }
    featureMap.get(key)?.actions.push(action);
  });

  // Build hierarchy based on route nesting
  const rootFeatures: ActionableFeature[] = [];
  routes.forEach(route => {
    const feature = Array.from(featureMap.values())
      .find(f => f.route === route);
    
    if (feature) {
      // Find parent route
      const parentRoute = routes.find(r => 
        r !== route && route.startsWith(r)
      );
      
      if (parentRoute) {
        const parentFeature = Array.from(featureMap.values())
          .find(f => f.route === parentRoute);
        parentFeature?.childFeatures?.push(feature);
      } else {
        rootFeatures.push(feature);
      }
    }
  });

  return rootFeatures;
};

export const analyzeUserActions = async (feature: ExtendedFeature): Promise<ActionableFeature[]> => {
  const allActions: UserAction[] = [];
  const routes: string[] = [];

  // Start with App.tsx to get routes
  feature.code_changes?.forEach(change => {
    if (change?.content && change.file_path) {
      // Skip non-UI files
      if (
        !change.file_path.includes('test') &&
        !change.file_path.includes('config') &&
        !change.file_path.includes('utils') &&
        !change.file_path.includes('.d.ts') &&
        !change.file_path.includes('.css') &&
        !change.file_path.includes('types')
      ) {
        // Extract routes if this is App.tsx
        if (change.file_path.includes('App.tsx')) {
          routes.push(...extractRouteFeatures(change.content));
        }

        // Analyze user interactions in the component
        const actions = analyzeUserInteractions(
          change.content, 
          change.file_path,
          routes.find(route => change.file_path.toLowerCase().includes(route.toLowerCase()))
        );
        allActions.push(...actions);
      }
    }
  });

  return buildFeatureHierarchy(allActions, routes);
};
