import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Parse request body
    const { repoFullName, productId, userId } = await req.json()

    console.log('Analyzing repository:', repoFullName);
    console.log('Product ID:', productId);
    console.log('User ID:', userId);

    if (!repoFullName || !productId || !userId) {
      console.error('Missing required parameters');
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get GitHub token directly from environment variables
    const githubToken = Deno.env.get('GITHUB_ACCESS_TOKEN');
    if (!githubToken) {
      console.error('GitHub token not found in environment variables');
      return new Response(
        JSON.stringify({ error: 'GitHub access token not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Successfully retrieved GitHub token');

    // Fetch repository content
    const apiUrl = `https://api.github.com/repos/${repoFullName}/contents`
    console.log('Fetching from GitHub API:', apiUrl);

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Supabase Function'
      }
    })

    if (!response.ok) {
      console.error('GitHub API error:', await response.text());
      return new Response(
        JSON.stringify({ error: 'Failed to fetch repository contents' }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const contents = await response.json()
    console.log('Successfully fetched repository contents');

    // Process repository contents to identify features
    const features = await processRepositoryContents(contents, repoFullName, githubToken)
    console.log('Processed features:', features);

    // Store features in the database
    const { error: featuresError } = await supabaseClient
      .from('features')
      .insert(features.map(feature => ({
        name: feature.name,
        description: feature.description,
        product_id: productId,
        author_id: userId,
        status: 'active',
        suggestions: feature.suggestions
      })))

    if (featuresError) {
      console.error('Failed to store features:', featuresError);
      return new Response(
        JSON.stringify({ error: 'Failed to store features in database' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Successfully stored features in database');
    return new Response(
      JSON.stringify({ success: true, features }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
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
  // Extract component name from file name
  const componentName = fileName.replace(/\.[^/.]+$/, '');
  
  // Initialize feature object with documentation structures
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
      faq: [] as Array<{ question: string, answer: string }>
    },
    suggestions: [] as Array<{
      type: 'technical' | 'user',
      category: string,
      suggestion: string,
      priority: 'high' | 'medium' | 'low'
    }>
  };

  // Analyze code patterns
  const hasExports = content.includes('export');
  const hasFunctions = content.includes('function');
  const hasProps = content.includes('interface') || content.includes('type');
  const hasJSX = content.includes('return (') || content.includes('return <');
  const hasStyles = content.includes('className=');
  const hasStateManagement = content.includes('useState') || content.includes('useReducer');
  const hasEffects = content.includes('useEffect');
  const hasAPI = content.includes('fetch') || content.includes('axios');
  const hasRouting = content.includes('useRouter') || content.includes('useNavigate');

  // Extract dependencies
  const dependencies = new Set<string>();
  content.match(/import .* from ['"](.*)['"];?/g)?.forEach(importStatement => {
    const match = importStatement.match(/from ['"](.*)['"];?/);
    if (match?.[1] && !match[1].startsWith('.')) {
      dependencies.add(match[1]);
    }
  });

  // Generate basic description
  if (hasJSX) {
    feature.description = `A React component that ${hasStateManagement ? 'manages state and ' : ''}${hasProps ? 'accepts props for ' : ''}${hasAPI ? 'interfaces with external data for ' : ''}rendering UI elements`;
  } else if (hasFunctions) {
    feature.description = `A utility module that provides functionality for ${fileName}`;
  }

  // Generate technical documentation
  feature.technical_docs = {
    architecture: generateArchitectureDoc(hasJSX, hasStateManagement, hasProps, hasAPI, hasEffects),
    setup: generateSetupDoc(Array.from(dependencies)),
    api_details: hasAPI ? generateAPIDoc(content) : '',
    code_snippets: extractCodeSnippets(content, fileName),
    dependencies: Array.from(dependencies)
  };

  // Generate user documentation
  feature.user_docs = {
    overview: generateOverview(feature.description, hasJSX, hasProps),
    steps: generateUsageSteps(hasProps, hasStateManagement, hasAPI),
    use_cases: generateUseCases(hasJSX, hasAPI, hasRouting),
    faq: generateFAQ(hasProps, hasStateManagement, hasAPI)
  };

  // Generate suggestions (existing suggestion generation code)
  if (hasProps) {
    feature.suggestions.push({
      type: 'technical',
      category: 'Props Documentation',
      suggestion: 'Document the component props and their types',
      priority: 'high'
    });
  }

  if (hasStateManagement) {
    feature.suggestions.push({
      type: 'technical',
      category: 'State Management',
      suggestion: 'Document the state management logic and data flow',
      priority: 'high'
    });
  }

  if (hasEffects) {
    feature.suggestions.push({
      type: 'technical',
      category: 'Side Effects',
      suggestion: 'Document the component lifecycle and side effects',
      priority: 'medium'
    });
  }

  if (hasAPI) {
    feature.suggestions.push({
      type: 'technical',
      category: 'API Integration',
      suggestion: 'Document the API endpoints and data structures used',
      priority: 'high'
    });
  }

  // Generate user documentation suggestions
  if (hasJSX) {
    feature.suggestions.push({
      type: 'user',
      category: 'Usage Guide',
      suggestion: 'Provide examples of how to use this component',
      priority: 'high'
    });

    if (hasProps) {
      feature.suggestions.push({
        type: 'user',
        category: 'Configuration',
        suggestion: 'Document the available configuration options',
        priority: 'medium'
      });
    }
  }

  if (hasRouting) {
    feature.suggestions.push({
      type: 'user',
      category: 'Navigation',
      suggestion: 'Document the navigation flows and URL patterns',
      priority: 'medium'
    });
  }

  // Add accessibility suggestions if it's a UI component
  if (hasJSX && hasStyles) {
    feature.suggestions.push({
      type: 'technical',
      category: 'Accessibility',
      suggestion: 'Document accessibility features and ARIA attributes',
      priority: 'high'
    });

    feature.suggestions.push({
      type: 'user',
      category: 'Visual Guide',
      suggestion: 'Add screenshots or videos demonstrating the component',
      priority: 'medium'
    });
  }

  return feature;
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

function generateOverview(description: string, hasJSX: boolean, hasProps: boolean): string {
  return `${description}
${hasJSX ? '\nThis component provides a user interface that ' + (hasProps ? 'can be customized through various properties.' : 'renders a specific view.') : ''}
${hasProps ? '\nYou can configure this component through its properties to adapt it to your specific needs.' : ''}`;
}

function generateUsageSteps(hasProps: boolean, hasStateManagement: boolean, hasAPI: boolean): string[] {
  const steps = ['Import the component into your React application'];
  
  if (hasProps) {
    steps.push('Configure the required properties');
  }
  
  if (hasStateManagement) {
    steps.push('Initialize any required state in your parent component');
  }
  
  if (hasAPI) {
    steps.push('Ensure your API endpoints are properly configured');
  }
  
  steps.push('Add the component to your JSX');
  
  return steps;
}

function generateUseCases(hasJSX: boolean, hasAPI: boolean, hasRouting: boolean): string[] {
  const useCases = [];
  
  if (hasJSX) {
    useCases.push('Display dynamic content in a user interface');
  }
  
  if (hasAPI) {
    useCases.push('Fetch and display data from external sources');
    useCases.push('Submit user input to backend services');
  }
  
  if (hasRouting) {
    useCases.push('Handle navigation between different views');
  }
  
  return useCases;
}

function generateFAQ(hasProps: boolean, hasStateManagement: boolean, hasAPI: boolean): Array<{ question: string; answer: string }> {
  const faq = [];
  
  if (hasProps) {
    faq.push({
      question: 'What properties can I configure?',
      answer: 'The component accepts various properties to customize its behavior. Check the technical documentation for a full list of available props.'
    });
  }
  
  if (hasStateManagement) {
    faq.push({
      question: 'How does the component handle state?',
      answer: 'The component manages its internal state using React hooks, providing a seamless user experience while maintaining data consistency.'
    });
  }
  
  if (hasAPI) {
    faq.push({
      question: 'What happens if the API request fails?',
      answer: 'The component includes error handling for API requests. You should implement appropriate error states and user feedback in your application.'
    });
  }
  
  return faq;
}
