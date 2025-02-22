
import { ExtendedFeature, FeatureContext, DocumentationPatterns } from '../types';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import { File, Node, Expression, Statement } from '@babel/types';

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
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  });

  const analysis: CodeAnalysis = {
    components: new Map(),
    routes: new Map(),
    dataFlow: new Map(),
    interactions: new Map(),
    boundaries: new Set(),
  };

  traverse(ast as any, {
    // Detect React Components
    FunctionDeclaration(path) {
      if (isReactComponent(path.node)) {
        const name = path.node.id?.name || '';
        analysis.components.set(name, {
          name,
          imports: detectImports(path),
          stateUsage: detectStateUsage(path),
          props: detectProps(path),
          eventHandlers: detectEventHandlers(path),
        });
      }
    },

    // Detect Routes
    JSXElement(path) {
      if (isRouteElement(path.node)) {
        const routeData = extractRouteData(path.node);
        if (routeData) {
          analysis.routes.set(routeData.path, routeData);
        }
      }
    },

    // Detect Data Flow
    CallExpression(path) {
      if (isDataFlowHook(path.node)) {
        const dataFlow = extractDataFlowMetadata(path.node);
        if (dataFlow) {
          analysis.dataFlow.set(path.node.callee.name, dataFlow);
        }
      }
    },

    // Detect User Interactions
    JSXAttribute(path) {
      if (isEventHandler(path.node)) {
        const interaction = extractInteractionMetadata(path.node);
        if (interaction) {
          analysis.interactions.set(interaction.handler, interaction);
        }
      }
    },
  });

  return analysis;
};

const isReactComponent = (node: Node): boolean => {
  return (
    node.type === 'FunctionDeclaration' &&
    Boolean(node.id?.name.match(/^[A-Z]/)) // Component names start with capital letter
  );
};

const detectImports = (path: any): Set<string> => {
  const imports = new Set<string>();
  path.traverse({
    ImportDeclaration(importPath: any) {
      imports.add(importPath.node.source.value);
    },
  });
  return imports;
};

const detectStateUsage = (path: any): Set<string> => {
  const stateUsage = new Set<string>();
  path.traverse({
    CallExpression(callPath: any) {
      if (callPath.node.callee.name === 'useState' ||
          callPath.node.callee.name === 'useReducer') {
        stateUsage.add(callPath.node.callee.name);
      }
    },
  });
  return stateUsage;
};

const detectProps = (path: any): Set<string> => {
  const props = new Set<string>();
  path.traverse({
    ObjectPattern(objPath: any) {
      objPath.node.properties.forEach((prop: any) => {
        props.add(prop.key.name);
      });
    },
  });
  return props;
};

const detectEventHandlers = (path: any): Set<string> => {
  const handlers = new Set<string>();
  path.traverse({
    JSXAttribute(attrPath: any) {
      if (attrPath.node.name.name.startsWith('on')) {
        handlers.add(attrPath.node.name.name);
      }
    },
  });
  return handlers;
};

const isRouteElement = (node: any): boolean => {
  return (
    node.openingElement &&
    node.openingElement.name &&
    node.openingElement.name.name === 'Route'
  );
};

const extractRouteData = (node: any): RouteMetadata | null => {
  const pathAttr = node.openingElement.attributes
    .find((attr: any) => attr.name.name === 'path');
  const elementAttr = node.openingElement.attributes
    .find((attr: any) => attr.name.name === 'element');

  if (!pathAttr || !elementAttr) return null;

  return {
    path: pathAttr.value.value,
    component: elementAttr.value.expression.name,
    isProtected: Boolean(node.openingElement.name.name === 'PrivateRoute'),
    params: extractRouteParams(pathAttr.value.value),
  };
};

const extractRouteParams = (path: string): Set<string> => {
  const params = new Set<string>();
  const matches = path.match(/:[^/]+/g) || [];
  matches.forEach(match => params.add(match.slice(1)));
  return params;
};

const isDataFlowHook = (node: any): boolean => {
  return (
    node.callee &&
    ['useQuery', 'useMutation', 'useContext', 'useState', 'useReducer']
      .includes(node.callee.name)
  );
};

const extractDataFlowMetadata = (node: any): DataFlowMetadata => {
  return {
    queries: new Set(node.callee.name === 'useQuery' ? [node.arguments[0]?.queryKey] : []),
    mutations: new Set(node.callee.name === 'useMutation' ? [node.arguments[0]?.mutationKey] : []),
    context: new Set(node.callee.name === 'useContext' ? [node.arguments[0]?.name] : []),
    state: new Set(node.callee.name === 'useState' ? [node.arguments[0]] : []),
  };
};

const isEventHandler = (node: any): boolean => {
  return node.name && node.name.name && node.name.name.startsWith('on');
};

const extractInteractionMetadata = (node: any): InteractionMetadata | null => {
  if (!node.value || !node.value.expression) return null;

  return {
    type: node.name.name.slice(2).toLowerCase() as 'click' | 'submit' | 'change' | 'input',
    handler: node.value.expression.name || '',
    component: node.parent.parent.openingElement.name.name,
  };
};

export const identifyFeatureContext = (feature: ExtendedFeature): FeatureContext => {
  const analysis = feature.code_changes?.reduce((acc: CodeAnalysis, change) => {
    if (change.content) {
      const changeAnalysis = analyzeCodeStructure(change.content);
      // Merge analyses
      changeAnalysis.components.forEach((v, k) => acc.components.set(k, v));
      changeAnalysis.routes.forEach((v, k) => acc.routes.set(k, v));
      changeAnalysis.dataFlow.forEach((v, k) => acc.dataFlow.set(k, v));
      changeAnalysis.interactions.forEach((v, k) => acc.interactions.set(k, v));
      changeAnalysis.boundaries.forEach(b => acc.boundaries.add(b));
    }
    return acc;
  }, {
    components: new Map(),
    routes: new Map(),
    dataFlow: new Map(),
    interactions: new Map(),
    boundaries: new Set(),
  });

  return {
    mainFeature: feature.name || 'Product Features',
    subFeature: Array.from(analysis.components.keys())[0] || '',
    userFlows: Array.from(analysis.interactions.values()).map(interaction => ({
      action: `${interaction.type} on ${interaction.component}`,
      steps: generateStepsFromAnalysis(interaction, analysis),
      expectedOutcome: `Successfully handled ${interaction.handler}`,
      prerequisites: extractPrerequisites(analysis),
    })),
    relatedFeatures: Array.from(analysis.boundaries),
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
    if (!change.content) return;

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
