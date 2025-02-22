
import { glob } from 'glob';
import { readFileSync } from 'fs';
import { parse as parseTypeScript } from '@typescript-eslint/parser';
import { AST_NODE_TYPES } from '@typescript-eslint/types';

interface FeatureCategory {
  name: string;
  features: Set<string>;
  description: string;
}

interface ComponentAnalysis {
  name: string;
  features: Set<string>;
  props: string[];
  events: string[];
  hooks: string[];
  apiCalls: string[];
  category?: string;
}

export class FeatureAnalyzer {
  private categories: Map<string, FeatureCategory> = new Map();
  private components: Map<string, ComponentAnalysis> = new Map();

  async analyzeCodebase(rootDir: string): Promise<Map<string, FeatureCategory>> {
    console.log('🔍 Starting enhanced feature analysis...');
    const files = await glob('src/**/*.{tsx,ts}', { cwd: rootDir });
    
    for (const file of files) {
      if (file.includes('.test.') || file.includes('.spec.')) continue;
      
      console.log(`\n📄 Analyzing: ${file}`);
      const content = readFileSync(`${rootDir}/${file}`, 'utf-8');
      const ast = parseTypeScript(content, { jsx: true });
      
      this.analyzeComponent(ast, file);
    }

    return this.categorizeFeatures();
  }

  private analyzeComponent(ast: any, filePath: string) {
    const componentName = this.extractComponentName(filePath);
    if (!componentName) return;

    console.log(`\n🔍 Analyzing component: ${componentName}`);

    const analysis: ComponentAnalysis = {
      name: componentName,
      features: new Set<string>(),
      props: [],
      events: [],
      hooks: [],
      apiCalls: [],
    };

    this.traverseAST(ast, {
      [AST_NODE_TYPES.JSXElement]: (node: any) => {
        // Detect UI components and their props
        const elementName = node.openingElement?.name?.name;
        if (elementName) {
          if (this.isUIComponent(elementName)) {
            analysis.features.add(`UI: ${this.normalizeFeature(elementName)}`);
            console.log(`🎨 Detected UI component: ${elementName}`);
          }
          
          // Analyze interactive elements
          if (this.isInteractiveElement(node)) {
            const interactions = this.extractInteractions(node);
            interactions.forEach(interaction => {
              analysis.features.add(`Action: ${interaction}`);
              console.log(`👆 Detected interaction: ${interaction}`);
            });
          }
        }
      },
      [AST_NODE_TYPES.CallExpression]: (node: any) => {
        // Detect hooks usage
        if (node.callee?.name?.startsWith('use')) {
          const hookName = node.callee.name;
          analysis.hooks.push(hookName);
          
          if (hookName === 'useQuery' || hookName === 'useMutation') {
            analysis.features.add(`Data: ${this.extractQueryFeature(node)}`);
            console.log(`🔄 Detected data operation: ${hookName}`);
          }
        }
        
        // Detect API calls
        if (this.isAPICall(node)) {
          const apiFeature = this.extractAPIFeature(node);
          analysis.features.add(`API: ${apiFeature}`);
          console.log(`🌐 Detected API call: ${apiFeature}`);
        }
      },
      [AST_NODE_TYPES.FunctionDeclaration]: (node: any) => {
        // Detect event handlers and business logic
        if (this.isEventHandler(node)) {
          const handlerFeature = this.extractHandlerFeature(node);
          analysis.features.add(`Handler: ${handlerFeature}`);
          console.log(`🎯 Detected event handler: ${handlerFeature}`);
        }
      }
    });

    this.components.set(componentName, analysis);
  }

  private categorizeFeatures(): Map<string, FeatureCategory> {
    console.log('\n📊 Categorizing features...');
    
    // Reset categories
    this.categories.clear();

    for (const [componentName, analysis] of this.components.entries()) {
      const features = Array.from(analysis.features);
      
      features.forEach(feature => {
        const category = this.determineFeatureCategory(feature);
        if (!this.categories.has(category)) {
          this.categories.set(category, {
            name: category,
            features: new Set(),
            description: this.generateCategoryDescription(category)
          });
        }
        
        this.categories.get(category)?.features.add(feature);
        console.log(`✨ Categorized: ${feature} -> ${category}`);
      });
    }

    return this.categories;
  }

  private isUIComponent(name: string): boolean {
    const uiPrefixes = ['Button', 'Card', 'Input', 'Form', 'Modal', 'Dialog', 'Menu'];
    return uiPrefixes.some(prefix => name.includes(prefix));
  }

  private isInteractiveElement(node: any): boolean {
    const interactiveElements = ['button', 'a', 'input', 'form', 'select'];
    const elementName = node.openingElement?.name?.name?.toLowerCase();
    return interactiveElements.includes(elementName);
  }

  private extractInteractions(node: any): string[] {
    const interactions: string[] = [];
    const attributes = node.openingElement?.attributes || [];
    
    attributes.forEach((attr: any) => {
      if (attr.name?.name?.startsWith('on')) {
        const eventName = attr.name.name.slice(2).toLowerCase();
        const handlerName = attr.value?.expression?.name || 'anonymous';
        interactions.push(`${eventName}:${handlerName}`);
      }
    });

    return interactions;
  }

  private isAPICall(node: any): boolean {
    const callee = node.callee;
    return (
      (callee?.object?.name === 'supabase') ||
      (callee?.property?.name === 'fetch') ||
      (callee?.object?.name === 'axios')
    );
  }

  private extractAPIFeature(node: any): string {
    const method = node.callee?.property?.name || 'unknown';
    const args = node.arguments || [];
    const endpoint = args[0]?.value || 'unknown';
    return `${method}:${endpoint}`;
  }

  private extractQueryFeature(node: any): string {
    const queryKey = node.arguments[0]?.properties?.find((p: any) => 
      p.key?.name === 'queryKey'
    )?.value?.elements?.[0]?.value || 'unknown';
    return `query:${queryKey}`;
  }

  private isEventHandler(node: any): boolean {
    const name = node.id?.name || '';
    return (
      name.startsWith('handle') ||
      name.includes('Handler') ||
      name.includes('Callback')
    );
  }

  private extractHandlerFeature(node: any): string {
    return this.normalizeFeature(node.id?.name || 'anonymous');
  }

  private determineFeatureCategory(feature: string): string {
    if (feature.startsWith('UI:')) return 'User Interface';
    if (feature.startsWith('Action:')) return 'User Interactions';
    if (feature.startsWith('Data:')) return 'Data Management';
    if (feature.startsWith('API:')) return 'API Integration';
    if (feature.startsWith('Handler:')) return 'Event Handling';
    return 'General Features';
  }

  private generateCategoryDescription(category: string): string {
    const descriptions: Record<string, string> = {
      'User Interface': 'Visual components and UI elements',
      'User Interactions': 'User actions and interactive features',
      'Data Management': 'Data fetching, caching, and state management',
      'API Integration': 'External API calls and integrations',
      'Event Handling': 'Event handlers and callbacks',
      'General Features': 'Miscellaneous application features',
    };
    return descriptions[category] || 'Miscellaneous features';
  }

  private normalizeFeature(name: string): string {
    return name
      .replace(/([A-Z])/g, ' $1')
      .toLowerCase()
      .trim();
  }

  private extractComponentName(filePath: string): string | null {
    const match = filePath.match(/\/([^\/]+)\.(tsx|ts)$/);
    return match ? match[1] : null;
  }

  private traverseAST(ast: any, visitors: Record<string, (node: any) => void>) {
    const visit = (node: any) => {
      if (!node) return;

      if (node.type && visitors[node.type]) {
        visitors[node.type](node);
      }

      for (const key in node) {
        if (typeof node[key] === 'object') {
          visit(node[key]);
        } else if (Array.isArray(node[key])) {
          node[key].forEach((child: any) => visit(child));
        }
      }
    };

    visit(ast);
  }
}
