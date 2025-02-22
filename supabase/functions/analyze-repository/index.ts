
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Octokit } from "https://esm.sh/octokit";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FileAnalysis {
  name: string;
  path: string;
  type: 'component' | 'utility' | 'style' | 'config' | 'test' | 'other';
  dependencies: string[];
  exports: string[];
  description: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { repoFullName, productId, userId } = await req.json();
    console.log('Analyzing repository:', repoFullName);

    if (!repoFullName) {
      throw new Error('Repository name is required');
    }

    const githubToken = Deno.env.get('GITHUB_ACCESS_TOKEN');
    if (!githubToken) {
      throw new Error('GitHub token not configured');
    }

    const octokit = new Octokit({ auth: githubToken });
    const [owner, repo] = repoFullName.split('/');

    // Get repository structure
    console.log('Getting repository structure...');
    const { data: repoContent } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: '',
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Analyze source files
    const sourceFiles: FileAnalysis[] = [];
    const analyzedPaths = new Set<string>();

    async function analyzeDirectory(path: string) {
      if (analyzedPaths.has(path)) return;
      analyzedPaths.add(path);

      console.log('Analyzing directory:', path);
      const { data: contents } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
      });

      if (!Array.isArray(contents)) return;

      for (const item of contents) {
        if (item.type === 'dir' && isRelevantDirectory(item.name)) {
          await analyzeDirectory(item.path);
        } else if (item.type === 'file' && isRelevantFile(item.name)) {
          try {
            const fileContent = await octokit.rest.repos.getContent({
              owner,
              repo,
              path: item.path,
            });

            // Get actual content from base64
            const content = typeof fileContent.data === 'object' && 'content' in fileContent.data
              ? Buffer.from(fileContent.data.content, 'base64').toString()
              : '';

            const analysis = analyzeFile(item.name, item.path, content);
            if (analysis) {
              sourceFiles.push(analysis);
            }
          } catch (error) {
            console.error(`Error analyzing file ${item.path}:`, error);
          }
        }
      }
    }

    // Start analysis from root
    await analyzeDirectory('');

    // Group files by feature
    const features = groupFilesByFeature(sourceFiles);

    // Store analysis results
    console.log('Storing analysis results...');
    for (const feature of features) {
      const { data: existingFeature, error: queryError } = await supabase
        .from('features')
        .select('id')
        .eq('name', feature.name)
        .eq('product_id', productId)
        .single();

      if (queryError && queryError.code !== 'PGRST116') {
        console.error('Error querying feature:', queryError);
        continue;
      }

      const featureData = {
        name: feature.name,
        description: feature.description,
        product_id: productId,
        user_id: userId,
        technical_docs: {
          architecture: generateArchitectureDoc(feature.files),
          setup: generateSetupDoc(feature.files),
          dependencies: extractDependencies(feature.files),
        },
        user_docs: {
          overview: generateUserOverview(feature),
          steps: generateUserSteps(feature),
          use_cases: generateUseCases(feature),
        },
      };

      if (existingFeature) {
        const { error: updateError } = await supabase
          .from('features')
          .update(featureData)
          .eq('id', existingFeature.id);

        if (updateError) {
          console.error('Error updating feature:', updateError);
        }
      } else {
        const { error: insertError } = await supabase
          .from('features')
          .insert(featureData);

        if (insertError) {
          console.error('Error inserting feature:', insertError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Repository analysis completed',
        features: features.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'An error occurred during analysis',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Helper functions
function isRelevantDirectory(name: string): boolean {
  const relevantDirs = ['src', 'components', 'pages', 'features', 'utils', 'hooks'];
  return relevantDirs.includes(name) || !name.startsWith('.');
}

function isRelevantFile(name: string): boolean {
  return /\.(ts|tsx|js|jsx)$/.test(name) && !name.includes('.test.') && !name.includes('.spec.');
}

function analyzeFile(name: string, path: string, content: string): FileAnalysis | null {
  // Skip test files and type definitions
  if (name.includes('.test.') || name.includes('.spec.') || name.endsWith('.d.ts')) {
    return null;
  }

  const type = determineFileType(path);
  const dependencies = extractImports(content);
  const exports = extractExports(content);
  const description = generateFileDescription(content, type);

  return {
    name,
    path,
    type,
    dependencies,
    exports,
    description,
  };
}

function determineFileType(path: string): FileAnalysis['type'] {
  if (path.includes('/components/')) return 'component';
  if (path.includes('/utils/')) return 'utility';
  if (path.includes('/styles/')) return 'style';
  if (path.includes('config')) return 'config';
  if (path.includes('.test.') || path.includes('.spec.')) return 'test';
  return 'other';
}

function extractImports(content: string): string[] {
  const imports = new Set<string>();
  const importRegex = /import\s+(?:{[^}]*}|\w+)\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    imports.add(match[1]);
  }

  return Array.from(imports);
}

function extractExports(content: string): string[] {
  const exports = new Set<string>();
  const exportRegex = /export\s+(?:default\s+)?(?:const|function|class|interface|type)\s+(\w+)/g;
  let match;
  
  while ((match = exportRegex.exec(content)) !== null) {
    exports.add(match[1]);
  }

  return Array.from(exports);
}

function generateFileDescription(content: string, type: FileAnalysis['type']): string {
  // Extract JSDoc comments if present
  const jsdocRegex = /\/\*\*\s*([\s\S]*?)\s*\*\//g;
  const jsdocMatch = jsdocRegex.exec(content);
  if (jsdocMatch) {
    return jsdocMatch[1].replace(/\s*\*\s*/g, ' ').trim();
  }

  // Generate description based on file content and type
  const lines = content.split('\n');
  const nonEmptyLines = lines.filter(line => line.trim() && !line.trim().startsWith('import'));
  
  if (type === 'component') {
    return `React ${nonEmptyLines[0].includes('function') ? 'functional' : 'class'} component`;
  }
  
  return `${type.charAt(0).toUpperCase() + type.slice(1)} module`;
}

interface FeatureGroup {
  name: string;
  description: string;
  files: FileAnalysis[];
}

function groupFilesByFeature(files: FileAnalysis[]): FeatureGroup[] {
  const features: FeatureGroup[] = [];
  const featureMap = new Map<string, FileAnalysis[]>();

  // Group files by directory structure
  for (const file of files) {
    const parts = file.path.split('/');
    let featureName = 'Core';

    // Try to identify feature name from path
    for (const part of parts) {
      if (['features', 'components', 'pages'].includes(part)) {
        const nextPart = parts[parts.indexOf(part) + 1];
        if (nextPart && !nextPart.includes('.')) {
          featureName = nextPart.charAt(0).toUpperCase() + nextPart.slice(1);
          break;
        }
      }
    }

    if (!featureMap.has(featureName)) {
      featureMap.set(featureName, []);
    }
    featureMap.get(featureName)!.push(file);
  }

  // Convert map to feature groups
  for (const [name, files] of featureMap.entries()) {
    features.push({
      name,
      description: generateFeatureDescription(files),
      files,
    });
  }

  return features;
}

function generateFeatureDescription(files: FileAnalysis[]): string {
  const componentFiles = files.filter(f => f.type === 'component');
  const utilityFiles = files.filter(f => f.type === 'utility');

  return `Feature containing ${componentFiles.length} components and ${utilityFiles.length} utility functions`;
}

function generateArchitectureDoc(files: FileAnalysis[]): string {
  const components = files.filter(f => f.type === 'component');
  const utilities = files.filter(f => f.type === 'utility');

  return `
## Architecture Overview

### Components (${components.length})
${components.map(c => `- ${c.name}: ${c.description}`).join('\n')}

### Utilities (${utilities.length})
${utilities.map(u => `- ${u.name}: ${u.description}`).join('\n')}

### Dependencies
${Array.from(new Set(files.flatMap(f => f.dependencies))).map(d => `- ${d}`).join('\n')}
  `.trim();
}

function generateSetupDoc(files: FileAnalysis[]): string {
  const configFiles = files.filter(f => f.type === 'config');
  const dependencies = new Set(files.flatMap(f => f.dependencies));

  return `
## Setup Guide

### Prerequisites
${Array.from(dependencies).map(d => `- ${d}`).join('\n')}

### Configuration
${configFiles.map(c => `- ${c.name}: ${c.description}`).join('\n')}
  `.trim();
}

function extractDependencies(files: FileAnalysis[]): string[] {
  return Array.from(new Set(files.flatMap(f => f.dependencies)));
}

function generateUserOverview(feature: FeatureGroup): string {
  return `
# ${feature.name}

${feature.description}

## Available Functionality
${feature.files
  .filter(f => f.type === 'component')
  .map(f => `- ${f.name.replace(/\.[^/.]+$/, '')}`).join('\n')}
  `.trim();
}

function generateUserSteps(feature: FeatureGroup): string[] {
  const components = feature.files.filter(f => f.type === 'component');
  return components.map(c => `Use ${c.name.replace(/\.[^/.]+$/, '')} to ${c.description.toLowerCase()}`);
}

function generateUseCases(feature: FeatureGroup): string[] {
  return feature.files
    .filter(f => f.type === 'component')
    .map(f => `Implement ${f.name.replace(/\.[^/.]+$/, '')} for ${f.description.toLowerCase()}`);
}
