import { ExtendedFeature, FeatureContext, DocumentationPatterns } from '../types';
import { PROMPTS } from '@/lib/prompts';

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

const analyzeCodeStructure = (code: string): CodeAnalysis => {
  const analysis: CodeAnalysis = {
    components: new Map<string, ComponentMetadata>(),
    routes: new Map<string, RouteMetadata>(),
    dataFlow: new Map<string, DataFlowMetadata>(),
    interactions: new Map<string, InteractionMetadata>(),
    boundaries: new Set<string>(),
  };

  try {
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

    const handlerMatches = code.match(/on[A-Z]\w+={[^}]+}/g) || [];
    handlerMatches.forEach(match => {
      const type = match.match(/on([A-Z]\w+)/) || [];
      const handler = match.match(/{([^}]+)}/) || [];
      if (type[1] && handler[1]) {
        analysis.interactions.set(handler[1], {
          type: type[1].toLowerCase() as 'click' | 'submit' | 'change' | 'input',
          handler: handler[1],
          component: 'Unknown',
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

export const identifyFeatureContext = (feature: ExtendedFeature): FeatureContext => {
  const analysis = feature.code_changes?.reduce((acc: CodeAnalysis, change) => {
    if (change?.content) {
      const changeAnalysis = analyzeCodeStructure(change.content);
      changeAnalysis.components.forEach((v: ComponentMetadata, k: string) => acc.components.set(k, v));
      changeAnalysis.routes.forEach((v: RouteMetadata, k: string) => acc.routes.set(k, v));
      changeAnalysis.dataFlow.forEach((v: DataFlowMetadata, k: string) => acc.dataFlow.set(k, v));
      changeAnalysis.interactions.forEach((v: InteractionMetadata, k: string) => acc.interactions.set(k, v));
      changeAnalysis.boundaries.forEach((b: string) => acc.boundaries.add(b));
    }
    return acc;
  }, {
    components: new Map<string, ComponentMetadata>(),
    routes: new Map<string, RouteMetadata>(),
    dataFlow: new Map<string, DataFlowMetadata>(),
    interactions: new Map<string, InteractionMetadata>(),
    boundaries: new Set<string>(),
  });

  const defaultAnalysis: CodeAnalysis = {
    components: new Map<string, ComponentMetadata>(),
    routes: new Map<string, RouteMetadata>(),
    dataFlow: new Map<string, DataFlowMetadata>(),
    interactions: new Map<string, InteractionMetadata>(),
    boundaries: new Set<string>(),
  };

  const finalAnalysis = analysis || defaultAnalysis;

  return {
    mainFeature: feature.name || 'Product Features',
    subFeature: Array.from(finalAnalysis.components.keys())[0] || '',
    userFlows: Array.from(finalAnalysis.interactions.values()).map(interaction => ({
      action: `${interaction.type} on ${interaction.component}`,
      steps: generateStepsFromAnalysis(interaction, finalAnalysis),
      expectedOutcome: `Successfully handled ${interaction.handler}`,
      prerequisites: extractPrerequisites(finalAnalysis),
    })),
    relatedFeatures: Array.from(finalAnalysis.boundaries) as string[],
  };
};

const generateStepsFromAnalysis = (
  interaction: InteractionMetadata,
  analysis: CodeAnalysis
): string[] => {
  const steps: string[] = [];
  const component = analysis.components.get(interaction.component);

  if (component) {
    steps.push(`Navigate to the ${interaction.component} component`);
    if (component.props.size > 0) {
      steps.push(`Ensure required props are provided: ${Array.from(component.props).join(', ')}`);
    }
    steps.push(`Trigger the ${interaction.type} event`);
    if (analysis.dataFlow.has(interaction.handler)) {
      steps.push('Wait for data operation to complete');
    }
  }

  return steps;
};

const extractPrerequisites = (analysis: CodeAnalysis): string[] => {
  const prerequisites: string[] = [];

  analysis.routes.forEach(route => {
    if (route.isProtected) {
      prerequisites.push('Authentication required');
    }
    if (route.params.size > 0) {
      prerequisites.push(`Required parameters: ${Array.from(route.params).join(', ')}`);
    }
  });

  analysis.dataFlow.forEach(flow => {
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
  };

  changes?.forEach(change => {
    if (!change?.content) return;

    const analysis = analyzeCodeStructure(change.content);

    // Map component interactions to user inputs
    analysis.components.forEach(component => {
      component.eventHandlers.forEach(handler => {
        if (handler.includes('Change') || handler.includes('Input')) {
          patterns.userInputs.add(component.name);
        }
      });
    });

    // Map interactions to user actions
    analysis.interactions.forEach(interaction => {
      patterns.userActions.add(`${interaction.type} ${interaction.handler}`);
    });

    // Map data flow to operations
    analysis.dataFlow.forEach((flow, key) => {
      if (flow.mutations.size > 0) {
        patterns.dataOperations.add(key);
      }
    });

    // Map components to UI components
    analysis.components.forEach(component => {
      patterns.uiComponents.add(component.name);
    });
  });

  return patterns;
};
