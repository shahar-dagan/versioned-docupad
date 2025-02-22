import { ExtendedFeature, FeatureContext, DocumentationPatterns } from '../types';

interface CodeAnalysis {
  components: Map<string, ComponentMetadata>;
  routes: Map<string, RouteMetadata>;
  dataFlow: Map<string, DataFlowMetadata>;
  interactions: Map<string, InteractionMetadata>;
  boundaries: Set<string>;
}

interface ComponentMetadata {
  name: string;
  imports: Set<string>;
  stateUsage: Set<string>;
  props: Set<string>;
  eventHandlers: Set<string>;
}

interface RouteMetadata {
  path: string;
  component: string;
  isProtected: boolean;
  params: Set<string>;
}

interface DataFlowMetadata {
  queries: Set<string>;
  mutations: Set<string>;
  context: Set<string>;
  state: Set<string>;
}

interface InteractionMetadata {
  type: 'click' | 'submit' | 'change' | 'input';
  handler: string;
  component: string;
}

interface FeatureMetadata {
  name: string;
  type: 'core' | 'integration' | 'ui' | 'business';
  dependencies: Set<string>;
  operations: Set<string>;
  dataFlow: Set<string>;
  relatedComponents: Set<string>;
}

// Simple pattern-based code analysis
const analyzeCodeStructure = (code: string): CodeAnalysis => {
  const analysis: CodeAnalysis = {
    components: new Map<string, ComponentMetadata>(),
    routes: new Map<string, RouteMetadata>(),
    dataFlow: new Map<string, DataFlowMetadata>(),
    interactions: new Map<string, InteractionMetadata>(),
    boundaries: new Set<string>(),
  };

  try {
    // Find component definitions
    const componentMatches = code.match(/(?:export\s+)?(?:const|function)\s+([A-Z]\w+)/g) || [];
    componentMatches.forEach(match => {
      const name = match.split(/\s+/).pop() || '';
      analysis.components.set(name, {
        name,
        imports: extractImports(code),
        stateUsage: extractStateUsage(code),
        props: extractProps(code),
        eventHandlers: extractEventHandlers(code),
      });
    });

    // Find routes
    const routeMatches = code.match(/<Route[^>]*>/g) || [];
    routeMatches.forEach(match => {
      const path = match.match(/path=["']([^"']+)["']/) || [];
      const component = match.match(/component=["']([^"']+)["']/) || [];
      if (path[1] && component[1]) {
        analysis.routes.set(path[1], {
          path: path[1],
          component: component[1],
          isProtected: match.includes('PrivateRoute'),
          params: extractRouteParams(path[1]),
        });
      }
    });

    // Find data flow patterns
    const hookMatches = code.match(/use(?:Query|Mutation|Context|State|Reducer)\(/g) || [];
    hookMatches.forEach(match => {
      const hookName = match.slice(0, -1);
      analysis.dataFlow.set(hookName, {
        queries: new Set(hookName === 'useQuery' ? ['query'] : []),
        mutations: new Set(hookName === 'useMutation' ? ['mutation'] : []),
        context: new Set(hookName === 'useContext' ? ['context'] : []),
        state: new Set(['state']),
      });
    });

    // Find user interactions
    const handlerMatches = code.match(/on[A-Z]\w+={[^}]+}/g) || [];
    handlerMatches.forEach(match => {
      const type = match.match(/on([A-Z]\w+)/) || [];
      const handler = match.match(/{([^}]+)}/) || [];
      if (type[1] && handler[1]) {
        analysis.interactions.set(handler[1], {
          type: type[1].toLowerCase() as 'click' | 'submit' | 'change' | 'input',
          handler: handler[1],
          component: 'Unknown', // We can't reliably determine this without proper parsing
        });
      }
    });

  } catch (error) {
    console.error('Error analyzing code:', error);
  }

  return analysis;
};

const extractImports = (code: string): Set<string> => {
  const imports = new Set<string>();
  const importMatches = code.match(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g) || [];
  importMatches.forEach(match => {
    const path = match.match(/from\s+['"]([^'"]+)['"]/) || [];
    if (path[1]) imports.add(path[1]);
  });
  return imports;
};

const extractStateUsage = (code: string): Set<string> => {
  const stateUsage = new Set<string>();
  const stateMatches = code.match(/use(?:State|Reducer)\(/g) || [];
  stateMatches.forEach(match => stateUsage.add(match.slice(0, -1)));
  return stateUsage;
};

const extractProps = (code: string): Set<string> => {
  const props = new Set<string>();
  const propMatches = code.match(/(?:interface|type)\s+\w+Props\s*=\s*{([^}]+)}/g) || [];
  propMatches.forEach(match => {
    const propDefinitions = match.match(/(\w+)\s*:/) || [];
    if (propDefinitions[1]) props.add(propDefinitions[1]);
  });
  return props;
};

const extractEventHandlers = (code: string): Set<string> => {
  const handlers = new Set<string>();
  const handlerMatches = code.match(/on[A-Z]\w+=/g) || [];
  handlerMatches.forEach(match => handlers.add(match.slice(0, -1)));
  return handlers;
};

const extractRouteParams = (path: string): Set<string> => {
  const params = new Set<string>();
  const matches = path.match(/:[^/]+/g) || [];
  matches.forEach(match => params.add(match.slice(1)));
  return params;
};

const analyzeFeaturePatterns = (code: string): FeatureMetadata => {
  const metadata: FeatureMetadata = {
    name: '',
    type: 'core',
    dependencies: new Set(),
    operations: new Set(),
    dataFlow: new Set(),
    relatedComponents: new Set(),
  };

  // Detect feature patterns through imports and component structure
  const importPattern = /import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importPattern.exec(code)) !== null) {
    const imports = match[1].split(',').map(i => i.trim());
    const path = match[2];
    
    // Identify feature by related imports
    imports.forEach(imp => {
      if (imp.includes('Provider')) metadata.type = 'integration';
      if (imp.includes('Form')) metadata.type = 'ui';
      if (imp.includes('Service')) metadata.type = 'business';
      metadata.dependencies.add(imp);
    });
  }

  // Detect operations through function declarations
  const functionPattern = /(?:async\s+)?function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g;
  while ((match = functionPattern.exec(code)) !== null) {
    const funcName = match[1] || match[2];
    if (funcName.includes('handle') || funcName.includes('process')) {
      metadata.operations.add(funcName);
    }
  }

  // Detect data flow through hooks and state management
  const dataFlowPattern = /use(?:State|Effect|Query|Mutation)|(?:dispatch|commit)\(/g;
  while ((match = dataFlowPattern.exec(code)) !== null) {
    metadata.dataFlow.add(match[0]);
  }

  return metadata;
};

export const identifyFeatureContext = (feature: ExtendedFeature): FeatureContext => {
  const patterns = analyzeCodeChanges(feature.code_changes);
  
  // Group related patterns to identify feature boundaries
  const featureGroups = new Map<string, Set<string>>();
  
  patterns.featurePatterns.forEach(pattern => {
    const [type, name] = pattern.split(':');
    if (!featureGroups.has(type)) {
      featureGroups.set(type, new Set());
    }
    featureGroups.get(type)?.add(name);
  });

  // Identify main feature and subfeatures
  const mainFeature = feature.name;
  const subFeatures = Array.from(featureGroups.entries()).map(([type, components]) => ({
    name: `${type} ${mainFeature}`,
    components: Array.from(components),
  }));

  // Generate user flows based on business logic and UI components
  const userFlows = Array.from(patterns.businessLogic).map(operation => ({
    action: operation,
    steps: generateStepsFromPatterns(operation, patterns),
    expectedOutcome: `Complete ${operation.toLowerCase()}`,
    prerequisites: extractPrerequisitesFromPatterns(patterns),
  }));

  return {
    mainFeature,
    subFeature: subFeatures[0]?.name || '',
    userFlows,
    relatedFeatures: Array.from(patterns.integrations),
  };
};

const generateStepsFromPatterns = (
  operation: string,
  patterns: DocumentationPatterns
): string[] => {
  const steps: string[] = [];
  
  // Add UI navigation steps
  patterns.uiComponents.forEach(component => {
    steps.push(`Navigate to ${component}`);
  });

  // Add data input steps
  patterns.userInputs.forEach(input => {
    steps.push(`Provide ${input}`);
  });

  // Add action steps
  patterns.userActions.forEach(action => {
    steps.push(`Perform ${action}`);
  });

  // Add data operation steps
  patterns.dataOperations.forEach(op => {
    steps.push(`System processes ${op}`);
  });

  return steps;
};

const extractPrerequisitesFromPatterns = (patterns: DocumentationPatterns): string[] => {
  const prerequisites: string[] = [];
  
  patterns.routes.forEach(route => {
    if (route.isProtected) {
      prerequisites.push('Authentication required');
    }
    if (route.params.size > 0) {
      prerequisites.push(`Required parameters: ${Array.from(route.params).join(', ')}`);
    }
  });

  patterns.dataFlow.forEach(flow => {
    if (flow.context.size > 0) {
      prerequisites.push(`Required context: ${Array.from(flow.context).join(', ')}`);
    }
  });

  return prerequisites;
};

export const analyzeCodeChanges = (changes: ExtendedFeature['code_changes']): DocumentationPatterns => {
  const patterns: DocumentationPatterns = {
    userInputs: new Set<string>(),
    userActions: new Set<string>(),
    dataOperations: new Set<string>(),
    uiComponents: new Set<string>(),
    featurePatterns: new Set<string>(),
    businessLogic: new Set<string>(),
    integrations: new Set<string>(),
    dataFlow: new Set<string>(),
  };

  changes?.forEach(change => {
    if (!change?.content) return;

    const analysis = analyzeCodeStructure(change.content);
    const featureMetadata = analyzeFeaturePatterns(change.content);

    // Map components and their relationships
    analysis.components.forEach(component => {
      patterns.uiComponents.add(component.name);
      featureMetadata.relatedComponents.add(component.name);
    });

    // Map feature patterns
    featureMetadata.dependencies.forEach(dep => {
      patterns.featurePatterns.add(`${featureMetadata.type}:${dep}`);
    });

    // Map business logic
    featureMetadata.operations.forEach(op => {
      patterns.businessLogic.add(op);
    });

    // Map integrations
    if (featureMetadata.type === 'integration') {
      patterns.integrations.add(Array.from(featureMetadata.dependencies).join(':'));
    }

    // Map data flow
    featureMetadata.dataFlow.forEach(flow => {
      patterns.dataFlow.add(flow);
    });
  });

  return patterns;
};
