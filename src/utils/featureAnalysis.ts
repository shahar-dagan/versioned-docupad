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
  props: string[];
  events: string[];
  userActions: string[];
}

export class FeatureAnalyzer {
  private categories: Map<string, FeatureCategory> = new Map();
  private components: Map<string, ComponentAnalysis> = new Map();

  async analyzeCodebase(rootDir: string): Promise<Map<string, FeatureCategory>> {
    // Find all relevant files
    const files = await glob('src/**/*.{tsx,ts}', { cwd: rootDir });

    for (const file of files) {
      // Skip test files and utilities
      if (file.includes('.test.') || file.includes('.spec.') || file.includes('/utils/')) {
        continue;
      }

      const content = readFileSync(`${rootDir}/${file}`, 'utf-8');
      const ast = parseTypeScript(content, {
        jsx: true,
        tokens: true,
      });

      this.analyzeComponent(ast, file);
    }

    return this.categorizeFeatures();
  }

  private analyzeComponent(ast: any, filePath: string) {
    const componentName = this.extractComponentName(filePath);
    if (!componentName) return;

    const analysis: ComponentAnalysis = {
      name: componentName,
      props: [],
      events: [],
      userActions: [],
    };

    // Analyze the AST for user interactions
    this.traverseAST(ast, {
      [AST_NODE_TYPES.JSXElement]: (node: any) => {
        // Look for interactive elements
        if (this.isInteractiveElement(node)) {
          const action = this.extractUserAction(node);
          if (action) analysis.userActions.push(action);
        }
      },
      [AST_NODE_TYPES.Property]: (node: any) => {
        // Look for event handlers
        if (this.isEventHandler(node)) {
          const event = this.extractEventName(node);
          if (event) analysis.events.push(event);
        }
      },
    });

    this.components.set(componentName, analysis);
  }

  private categorizeFeatures(): Map<string, FeatureCategory> {
    for (const [componentName, analysis] of this.components.entries()) {
      const category = this.determineCategory(componentName, analysis);
      
      if (!this.categories.has(category)) {
        this.categories.set(category, {
          name: category,
          features: new Set(),
          description: this.generateCategoryDescription(category),
        });
      }

      const categoryData = this.categories.get(category)!;
      analysis.userActions.forEach(action => {
        categoryData.features.add(this.normalizeFeature(action));
      });
    }

    return this.categories;
  }

  private determineCategory(componentName: string, analysis: ComponentAnalysis): string {
    // Use component naming patterns and actions to determine category
    if (componentName.includes('Auth')) return 'Authentication';
    if (componentName.includes('Product')) return 'Product Management';
    if (componentName.includes('Feature')) return 'Feature Management';
    if (componentName.includes('Doc')) return 'Documentation';
    if (componentName.includes('Team')) return 'Team Management';
    return 'General Features';
  }

  private isInteractiveElement(node: any): boolean {
    const interactiveElements = ['button', 'a', 'input', 'form', 'select'];
    return interactiveElements.includes(node.openingElement?.name?.name?.toLowerCase());
  }

  private extractUserAction(node: any): string | null {
    // Extract action from onClick handlers, button text, etc.
    const onClick = node.openingElement?.attributes?.find(
      (attr: any) => attr.name?.name === 'onClick'
    );
    if (onClick) {
      return this.normalizeHandlerName(onClick.value?.expression?.name);
    }
    return null;
  }

  private normalizeFeature(action: string): string {
    // Convert camelCase to readable text
    return action
      .replace(/([A-Z])/g, ' $1')
      .toLowerCase()
      .trim();
  }

  // ... other helper methods
} 