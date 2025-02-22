
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
  category?: string;
}

export class FeatureAnalyzer {
  private categories: Map<string, FeatureCategory> = new Map();
  private components: Map<string, ComponentAnalysis> = new Map();

  async analyzeCodebase(rootDir: string): Promise<Map<string, FeatureCategory>> {
    console.log('🔍 Starting codebase analysis...');
    const files = await glob('src/**/*.{tsx,ts}', { cwd: rootDir });
    console.log(`📁 Found ${files.length} files to analyze`);

    for (const file of files) {
      if (file.includes('.test.') || file.includes('.spec.') || file.includes('/utils/')) {
        continue;
      }

      console.log(`\n📄 Analyzing file: ${file}`);
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

    console.log(`\n🔍 Analyzing component: ${componentName}`);

    const analysis: ComponentAnalysis = {
      name: componentName,
      props: [],
      events: [],
      userActions: [],
    };

    this.traverseAST(ast, {
      [AST_NODE_TYPES.JSXElement]: (node: any) => {
        if (this.isInteractiveElement(node)) {
          const action = this.extractUserAction(node);
          if (action) {
            analysis.userActions.push(action);
            console.log(`👆 Detected user action: ${action}`);
          }
        }
      },
      [AST_NODE_TYPES.Property]: (node: any) => {
        if (this.isEventHandler(node)) {
          const event = this.extractEventName(node);
          if (event) {
            analysis.events.push(event);
            console.log(`🎯 Detected event handler: ${event}`);
          }
        }
      },
      [AST_NODE_TYPES.TSTypeAnnotation]: (node: any) => {
        const prop = this.extractPropName(node);
        if (prop) {
          analysis.props.push(prop);
          console.log(`🔧 Detected prop: ${prop}`);
        }
      },
    });

    this.components.set(componentName, analysis);
  }

  private categorizeFeatures(): Map<string, FeatureCategory> {
    console.log('\n📊 Categorizing features...');

    for (const [componentName, analysis] of this.components.entries()) {
      const category = this.determineCategory(componentName, analysis);
      analysis.category = category;

      console.log(`\n🏷️ Component "${componentName}" categorized as: ${category}`);

      if (!this.categories.has(category)) {
        this.categories.set(category, {
          name: category,
          features: new Set(),
          description: this.generateCategoryDescription(category),
        });
      }

      const categoryData = this.categories.get(category)!;
      analysis.userActions.forEach(action => {
        const normalizedFeature = this.normalizeFeature(action);
        categoryData.features.add(normalizedFeature);
        console.log(`✨ Added feature: ${normalizedFeature}`);
      });
    }

    // Log final categorization
    console.log('\n📋 Final Feature Categories:');
    this.categories.forEach((category, name) => {
      console.log(`\n${name}:`);
      console.log('Features:', Array.from(category.features));
      console.log('Description:', category.description);
    });

    return this.categories;
  }

  private determineCategory(componentName: string, analysis: ComponentAnalysis): string {
    // Enhanced categorization logic
    if (componentName.toLowerCase().includes('auth')) return 'Authentication';
    if (componentName.toLowerCase().includes('product')) return 'Product Management';
    if (componentName.toLowerCase().includes('feature')) return 'Feature Management';
    if (componentName.toLowerCase().includes('doc')) return 'Documentation';
    if (componentName.toLowerCase().includes('team')) return 'Team Management';
    
    // New categories based on component behavior
    if (analysis.events.some(e => e.includes('submit') || e.includes('save'))) return 'Form Management';
    if (analysis.events.some(e => e.includes('delete') || e.includes('remove'))) return 'Data Management';
    if (analysis.events.some(e => e.includes('search') || e.includes('filter'))) return 'Search & Filter';
    if (analysis.props.some(p => p.includes('chart') || p.includes('graph'))) return 'Analytics';
    
    return 'General Features';
  }

  private generateCategoryDescription(category: string): string {
    const descriptions: Record<string, string> = {
      'Authentication': 'User authentication and authorization features',
      'Product Management': 'Features related to product creation, editing, and deletion',
      'Feature Management': 'Features for managing product features and capabilities',
      'Documentation': 'Documentation generation and management features',
      'Team Management': 'Team collaboration and management features',
      'Form Management': 'Form handling and data submission features',
      'Data Management': 'Data manipulation and storage features',
      'Search & Filter': 'Search, filtering, and data organization features',
      'Analytics': 'Data visualization and analytics features',
      'General Features': 'General application features and utilities',
    };

    return descriptions[category] || 'Miscellaneous features';
  }

  private isInteractiveElement(node: any): boolean {
    const interactiveElements = ['button', 'a', 'input', 'form', 'select', 'textarea'];
    return interactiveElements.includes(node.openingElement?.name?.name?.toLowerCase());
  }

  private extractUserAction(node: any): string | null {
    const onClick = node.openingElement?.attributes?.find(
      (attr: any) => attr.name?.name === 'onClick'
    );
    if (onClick) {
      return this.normalizeHandlerName(onClick.value?.expression?.name);
    }
    return null;
  }

  private normalizeFeature(action: string): string {
    return action
      .replace(/([A-Z])/g, ' $1')
      .toLowerCase()
      .trim();
  }

  private extractComponentName(filePath: string): string | null {
    const match = filePath.match(/\/([^\/]+)\.(tsx|ts)$/);
    return match ? match[1] : null;
  }

  private isEventHandler(node: any): boolean {
    return node.key?.name?.startsWith('on');
  }

  private extractEventName(node: any): string | null {
    return node.key?.name || null;
  }

  private extractPropName(node: any): string | null {
    return node.typeAnnotation?.typeAnnotation?.type === 'TSStringKeyword' ? node.key?.name : null;
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
