
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

interface RouteFeature {
  path: string;
  element: string;
  isAuthProtected: boolean;
  parentPath?: string;
}

const extractRoutes = (content: string): RouteFeature[] => {
  const routes: RouteFeature[] = [];
  const routePattern = /<Route[^>]*path=["']([^"']+)["'][^>]*element={<?([^}>]+)>?}/g;
  const matches = Array.from(content.matchAll(routePattern));
  
  matches.forEach(match => {
    const path = match[1];
    const element = match[2];
    
    // Determine if route requires auth by analyzing its context
    const isAuthProtected = 
      path.includes('dashboard') || 
      path.includes('products') ||
      element.includes('Private') ||
      content.slice(Math.max(0, match.index! - 200), match.index).includes('AuthProvider');

    routes.push({
      path,
      element: element.replace(/[<>]/g, ''),
      isAuthProtected,
      parentPath: findParentPath(path, routes)
    });
  });

  return routes;
};

const findParentPath = (path: string, routes: RouteFeature[]): string | undefined => {
  const segments = path.split('/').filter(Boolean);
  if (segments.length <= 1) return undefined;
  
  // Remove the last segment to find parent path
  const parentSegments = segments.slice(0, -1);
  const potentialParent = '/' + parentSegments.join('/');
  
  return routes.find(r => r.path === potentialParent)?.path;
};

const analyzeDataOperations = (content: string): Map<string, Set<string>> => {
  const operations = new Map<string, Set<string>>();
  
  // Find database table names from Supabase queries
  const tablePattern = /from\(['"]([^'"]+)['"]\)/g;
  const tableMatches = Array.from(content.matchAll(tablePattern));
  
  tableMatches.forEach(match => {
    const tableName = match[1];
    if (!operations.has(tableName)) {
      operations.set(tableName, new Set());
    }
    
    // Find operations on this table
    const currentOps = operations.get(tableName)!;
    if (content.includes(`.select`)) currentOps.add('view');
    if (content.includes(`.insert`)) currentOps.add('create');
    if (content.includes(`.update`)) currentOps.add('edit');
    if (content.includes(`.delete`)) currentOps.add('delete');
  });
  
  return operations;
};

const analyzeComponentFeatures = (content: string, filePath: string): Set<string> => {
  const features = new Set<string>();
  
  // Identify authentication features
  if (content.includes('auth.signIn') || content.includes('sign in')) features.add('Authentication');
  if (content.includes('auth.signUp') || content.includes('sign up')) features.add('User Registration');
  
  // Identify data management features
  if (content.includes('useState') || content.includes('useReducer')) features.add('State Management');
  if (content.includes('useQuery')) features.add('Data Fetching');
  if (content.includes('useMutation')) features.add('Data Modification');
  
  // Identify file/document features
  if (content.includes('upload') || content.includes('file')) features.add('File Management');
  if (content.includes('document') || content.includes('.doc')) features.add('Documentation');
  
  // Identify collaboration features
  if (content.includes('team') || content.includes('member')) features.add('Team Collaboration');
  if (content.includes('share') || content.includes('permission')) features.add('Sharing');
  
  // Identify integration features
  if (content.includes('github') || content.includes('repository')) features.add('GitHub Integration');
  if (content.includes('analyze') || content.includes('scan')) features.add('Code Analysis');
  
  return features;
};

const buildFeatureHierarchy = (
  routes: RouteFeature[],
  componentAnalysis: Map<string, Set<string>>,
  dataOperations: Map<string, Set<string>>
): ActionableFeature[] => {
  const features: ActionableFeature[] = [];
  const processedPaths = new Set<string>();

  // Create feature groups based on route structure
  routes.forEach(route => {
    if (processedPaths.has(route.path)) return;
    processedPaths.add(route.path);

    const feature: ActionableFeature = {
      name: route.element.replace(/Page$|Component$/, ''),
      description: `Manage ${route.element.toLowerCase()}`,
      path: route.path,
      route: route.path,
      actions: [],
      childFeatures: [],
      requiredAuth: route.isAuthProtected
    };

    // Add actions based on component analysis
    const componentFeatures = componentAnalysis.get(route.element) || new Set<string>();
    componentFeatures.forEach(f => {
      feature.actions.push({
        type: 'view',
        description: f,
        location: route.path,
        route: route.path,
        componentName: route.element
      });
    });

    // Add actions based on data operations
    dataOperations.forEach((ops, table) => {
      ops.forEach(op => {
        feature.actions.push({
          type: op as any,
          description: `${op} ${table}`,
          location: route.path,
          route: route.path,
          componentName: route.element
        });
      });
    });

    // Find and link child features
    routes
      .filter(r => r.parentPath === route.path)
      .forEach(childRoute => {
        const childFeature = buildFeatureHierarchy(
          [childRoute],
          componentAnalysis,
          dataOperations
        )[0];
        if (childFeature) {
          feature.childFeatures?.push(childFeature);
        }
      });

    features.push(feature);
  });

  return features;
};

export const analyzeUserActions = async (feature: ExtendedFeature): Promise<ActionableFeature[]> => {
  const routes: RouteFeature[] = [];
  const componentAnalysis = new Map<string, Set<string>>();
  const allDataOperations = new Map<string, Set<string>>();

  // Analyze the entire codebase
  feature.code_changes?.forEach(change => {
    if (!change?.content || !change.file_path) return;

    // Extract routes from App.tsx
    if (change.file_path.includes('App.tsx')) {
      routes.push(...extractRoutes(change.content));
    }

    // Skip non-UI files
    if (
      !change.file_path.includes('test') &&
      !change.file_path.includes('config') &&
      !change.file_path.includes('.d.ts') &&
      !change.file_path.includes('.css')
    ) {
      // Analyze component features
      const componentName = change.file_path.split('/').pop()?.replace(/\.[^/.]+$/, '') || '';
      componentAnalysis.set(
        componentName,
        analyzeComponentFeatures(change.content, change.file_path)
      );

      // Analyze data operations
      const dataOps = analyzeDataOperations(change.content);
      dataOps.forEach((ops, table) => {
        if (!allDataOperations.has(table)) {
          allDataOperations.set(table, new Set());
        }
        ops.forEach(op => allDataOperations.get(table)?.add(op));
      });
    }
  });

  return buildFeatureHierarchy(routes, componentAnalysis, allDataOperations);
};
