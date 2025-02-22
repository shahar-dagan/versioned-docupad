
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { Octokit } from "https://esm.sh/octokit@3.1.2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnalyzeRequest {
  repoFullName: string;
  productId: string;
  userId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { repoFullName, productId, userId } = await req.json() as AnalyzeRequest

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Initialize GitHub client
    const octokit = new Octokit({
      auth: Deno.env.get('GITHUB_ACCESS_TOKEN')
    })

    // Get repository content
    const [owner, repo] = repoFullName.split('/')
    const { data: repoContent } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: 'src'
    })

    if (!Array.isArray(repoContent)) {
      throw new Error('Unable to read repository content')
    }

    // Get all features for this product
    const { data: features, error: featuresError } = await supabaseClient
      .from('features')
      .select('*')
      .eq('product_id', productId)

    if (featuresError) throw featuresError

    // Process each file
    for (const file of repoContent) {
      if (file.type !== 'file') continue

      const { data: fileContent } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: file.path,
      })

      if (Array.isArray(fileContent)) continue

      const content = Buffer.from(fileContent.content, 'base64').toString()
      const fileHash = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(content)
      ).then(hash => Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(''))

      // Check for each feature if this file is relevant
      for (const feature of features) {
        // Store file change
        const { data: existingChange } = await supabaseClient
          .from('feature_file_changes')
          .select('*')
          .eq('feature_id', feature.id)
          .eq('file_path', file.path)
          .eq('file_hash', fileHash)
          .maybeSingle()

        if (!existingChange) {
          await supabaseClient
            .from('feature_file_changes')
            .insert({
              feature_id: feature.id,
              file_path: file.path,
              file_hash: fileHash,
              analyzed: false
            })

          // Analyze content and update documentation if needed
          const analysis = analyzeFileContent(content, file.name)
          
          // Update feature with new documentation
          await supabaseClient
            .from('features')
            .update({
              suggestions: analysis.suggestions,
              last_analyzed_at: new Date().toISOString(),
              last_code_hash: fileHash
            })
            .eq('id', feature.id)

          // Mark file change as analyzed
          await supabaseClient
            .from('feature_file_changes')
            .update({ analyzed: true })
            .eq('feature_id', feature.id)
            .eq('file_path', file.path)
        }
      }
    }

    return new Response(
      JSON.stringify({ message: 'Repository analyzed successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})

async function processRepositoryContents(contents: any[], repoFullName: string, githubToken: string) {
  try {
    console.log('Starting to process repository contents');
    const features = [];

    // Process each file in the repository
    for (const item of contents) {
      if (item.type === 'file' && 
         (item.name.endsWith('.md') || 
          item.name.endsWith('.js') || 
          item.name.endsWith('.ts') || 
          item.name.endsWith('.tsx') || 
          item.name.endsWith('.jsx'))) {
        
        console.log('Processing file:', item.name);
        
        // Fetch file content
        const response = await fetch(item.download_url, {
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3.raw',
            'User-Agent': 'Supabase Function'
          }
        });

        if (!response.ok) {
          console.error(`Failed to fetch file ${item.name}:`, await response.text());
          continue;
        }

        const content = await response.text();
        
        // Extract potential features and generate documentation suggestions
        const fileFeature = analyzeFileContent(content, item.name);
        if (fileFeature) {
          features.push(fileFeature);
        }
      }
    }

    console.log(`Extracted ${features.length} features`);
    return features;
  } catch (error) {
    console.error('Error processing repository contents:', error);
    throw error;
  }
}

function analyzeFileContent(content: string, fileName: string) {
  const componentName = fileName.replace(/\.[^/.]+$/, '');
  
  // Initialize feature object
  const feature = {
    name: componentName,
    description: '',
    technical_docs: {
      architecture: '',
      setup: '',
      api_details: '',
      code_snippets: [] as Array<{ language: string, code: string, description: string }>,
      dependencies: [] as string[]
    },
    user_docs: {
      overview: '',
      steps: [] as string[],
      use_cases: [] as string[],
      visuals: [] as Array<{ type: 'screenshot' | 'video', url: string, caption: string }>,
      faq: [] as Array<{ question: string, answer: string }>
    },
    suggestions: [] as Array<{
      type: 'technical' | 'user',
      category: string,
      suggestion: string,
      priority: 'high' | 'medium' | 'low'
    }>
  };

  // Analyze UI patterns and interactions
  const hasForm = content.includes('form') || content.includes('onSubmit');
  const hasInputs = content.includes('input') || content.includes('select') || content.includes('textarea');
  const hasButtons = content.includes('button') || content.includes('onClick');
  const hasNavigation = content.includes('Link') || content.includes('useNavigate');
  const hasFileHandling = content.includes('File') || content.includes('upload');
  const hasAuthentication = content.includes('auth') || content.includes('login') || content.includes('signup');
  const hasTables = content.includes('table') || content.includes('thead') || content.includes('tbody');
  const hasFiltering = content.includes('filter') || content.includes('search');
  const hasSorting = content.includes('sort');
  const hasPagination = content.includes('pagination') || content.includes('page');
  const hasModals = content.includes('Dialog') || content.includes('Modal');
  const hasToasts = content.includes('toast') || content.includes('alert') || content.includes('notification');
  
  // Identify the main user workflow
  const workflows = identifyWorkflows({
    hasForm,
    hasInputs,
    hasButtons,
    hasNavigation,
    hasFileHandling,
    hasAuthentication,
    hasTables,
    hasFiltering,
    hasSorting,
    hasPagination,
    hasModals,
    hasToasts
  });

  // Generate user-focused description
  feature.description = generateUserDescription(workflows, componentName);

  // Generate user documentation
  feature.user_docs = {
    overview: generateUserOverview(workflows, componentName),
    steps: generateWorkflowSteps(workflows),
    use_cases: generateUserStories(workflows),
    visuals: [], // Placeholder for screenshots/videos
    faq: generateUserFAQ(workflows)
  };

  // Add documentation suggestions
  feature.suggestions = generateDocSuggestions(workflows);

  return feature;
}

interface Workflow {
  type: string;
  description: string;
  actions: string[];
  userGoal: string;
}

function identifyWorkflows(patterns: Record<string, boolean>): Workflow[] {
  const workflows: Workflow[] = [];

  if (patterns.hasAuthentication) {
    workflows.push({
      type: 'authentication',
      description: 'User authentication and account management',
      actions: ['Sign up for a new account', 'Log in to existing account', 'Reset password'],
      userGoal: 'Access secure features and personalized content'
    });
  }

  if (patterns.hasForm && patterns.hasInputs) {
    workflows.push({
      type: 'data-entry',
      description: 'Data input and form submission',
      actions: ['Fill out form fields', 'Validate input', 'Submit data'],
      userGoal: 'Submit or update information in the system'
    });
  }

  if (patterns.hasTables && (patterns.hasFiltering || patterns.hasSorting || patterns.hasPagination)) {
    workflows.push({
      type: 'data-management',
      description: 'Data browsing and management',
      actions: [
        patterns.hasFiltering ? 'Filter data' : '',
        patterns.hasSorting ? 'Sort results' : '',
        patterns.hasPagination ? 'Navigate between pages' : ''
      ].filter(Boolean),
      userGoal: 'Find and manage specific information efficiently'
    });
  }

  if (patterns.hasFileHandling) {
    workflows.push({
      type: 'file-handling',
      description: 'File upload and management',
      actions: ['Select files', 'Upload files', 'View upload progress', 'Manage uploaded files'],
      userGoal: 'Add and manage files in the system'
    });
  }

  if (patterns.hasNavigation) {
    workflows.push({
      type: 'navigation',
      description: 'Application navigation',
      actions: ['Navigate between sections', 'Access different features', 'Return to previous views'],
      userGoal: 'Move between different parts of the application'
    });
  }

  return workflows;
}

function generateUserDescription(workflows: Workflow[], componentName: string): string {
  if (!workflows.length) {
    return `The ${componentName} component provides user interface elements for interacting with the application.`;
  }

  const mainWorkflow = workflows[0];
  return `The ${componentName} component helps users ${mainWorkflow.userGoal.toLowerCase()}. It provides a streamlined interface for ${mainWorkflow.description.toLowerCase()}.`;
}

function generateUserOverview(workflows: Workflow[], componentName: string): string {
  if (!workflows.length) {
    return `This section of the application provides user interface elements for basic interactions.`;
  }

  const workflowDescriptions = workflows
    .map(w => `- ${w.description}: Allows users to ${w.userGoal.toLowerCase()}`)
    .join('\n');

  return `This part of the application helps you accomplish the following:

${workflowDescriptions}

The interface is designed to be intuitive and guide you through each process step by step.`;
}

function generateWorkflowSteps(workflows: Workflow[]): string[] {
  const steps: string[] = [];

  workflows.forEach(workflow => {
    steps.push(`To ${workflow.userGoal}:`);
    workflow.actions.forEach(action => {
      steps.push(action);
    });
  });

  return steps;
}

function generateUserStories(workflows: Workflow[]): string[] {
  return workflows.map(workflow => 
    `As a user, I want to ${workflow.userGoal.toLowerCase()} by ${workflow.actions[0].toLowerCase()}`
  );
}

function generateUserFAQ(workflows: Workflow[]): Array<{ question: string; answer: string }> {
  const faqs: Array<{ question: string; answer: string }> = [];

  workflows.forEach(workflow => {
    faqs.push({
      question: `How do I ${workflow.userGoal.toLowerCase()}?`,
      answer: `You can ${workflow.userGoal.toLowerCase()} by following these steps: ${workflow.actions.join(', ').toLowerCase()}.`
    });

    faqs.push({
      question: `What happens after I ${workflow.actions[workflow.actions.length - 1].toLowerCase()}?`,
      answer: `After you ${workflow.actions[workflow.actions.length - 1].toLowerCase()}, the system will process your request and provide appropriate feedback.`
    });
  });

  return faqs;
}

function generateDocSuggestions(workflows: Workflow[]): Array<{
  type: 'technical' | 'user';
  category: string;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
}> {
  const suggestions = [];

  workflows.forEach(workflow => {
    suggestions.push({
      type: 'user',
      category: 'User Guide',
      suggestion: `Add step-by-step guide for ${workflow.description.toLowerCase()}`,
      priority: 'high'
    });

    suggestions.push({
      type: 'user',
      category: 'Visual Documentation',
      suggestion: `Add screenshots or videos demonstrating ${workflow.description.toLowerCase()}`,
      priority: 'high'
    });

    suggestions.push({
      type: 'technical',
      category: 'Implementation Guide',
      suggestion: `Document the technical implementation of ${workflow.description.toLowerCase()}`,
      priority: 'medium'
    });
  });

  return suggestions;
}

function generateArchitectureDoc(hasJSX: boolean, hasStateManagement: boolean, hasProps: boolean, hasAPI: boolean, hasEffects: boolean): string {
  const parts = [];
  
  if (hasJSX) {
    parts.push("This is a React component");
    if (hasStateManagement) parts.push("implements internal state management");
    if (hasProps) parts.push("accepts configuration through props");
    if (hasAPI) parts.push("integrates with external data sources");
    if (hasEffects) parts.push("handles side effects");
  } else {
    parts.push("This is a utility module that provides helper functions");
  }

  return parts.join(" that ") + ". " + 
    (hasStateManagement ? "The component manages its own state using React hooks. " : "") +
    (hasEffects ? "Side effects are handled through useEffect hooks. " : "") +
    (hasAPI ? "External data is fetched and managed within the component. " : "");
}

function generateSetupDoc(dependencies: string[]): string {
  if (!dependencies.length) return "No external dependencies required.";
  
  return `
This component requires the following dependencies:
${dependencies.map(dep => `- ${dep}`).join('\n')}

To use this component, ensure these dependencies are installed in your project.`;
}

function generateAPIDoc(content: string): string {
  const apiCalls = content.match(/(?:fetch|axios)\((.*?)\)/g);
  if (!apiCalls) return '';

  return `
This component interacts with external APIs.
The following API interactions are implemented:
${apiCalls.map(call => `- API call: ${call}`).join('\n')}

Please ensure proper error handling and loading states are implemented when using these API calls.`;
}

function extractCodeSnippets(content: string, fileName: string): Array<{ language: string; code: string; description: string }> {
  const snippets = [];
  const fileExtension = fileName.split('.').pop() || 'ts';

  // Extract interfaces/types
  const interfaceMatch = content.match(/interface.*?{[^}]*}/gs);
  if (interfaceMatch) {
    snippets.push({
      language: fileExtension,
      code: interfaceMatch[0],
      description: 'Component interface definition'
    });
  }

  // Extract main component or function
  const mainComponent = content.match(/export (?:default )?(?:function|const) .*?{.*?}/gs);
  if (mainComponent) {
    snippets.push({
      language: fileExtension,
      code: mainComponent[0],
      description: 'Main component implementation'
    });
  }

  return snippets;
}
