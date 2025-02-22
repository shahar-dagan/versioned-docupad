
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
  
  // Initialize feature object
  const feature = {
    name: componentName,
    description: '',
    suggestions: [] as Array<{
      type: 'technical' | 'user',
      category: string,
      suggestion: string,
      priority: 'high' | 'medium' | 'low'
    }>
  };

  // Analyze exports and functions
  const hasExports = content.includes('export');
  const hasFunctions = content.includes('function');
  const hasProps = content.includes('interface') || content.includes('type');
  const hasJSX = content.includes('return (') || content.includes('return <');
  const hasStyles = content.includes('className=');
  const hasStateManagement = content.includes('useState') || content.includes('useReducer');
  const hasEffects = content.includes('useEffect');
  const hasAPI = content.includes('fetch') || content.includes('axios');
  const hasRouting = content.includes('useRouter') || content.includes('useNavigate');

  // Set description based on analysis
  if (hasJSX) {
    feature.description = `A React component that ${hasStateManagement ? 'manages state and ' : ''}${hasProps ? 'accepts props for ' : ''}${hasAPI ? 'interfaces with external data for ' : ''}rendering UI elements`;
  } else if (hasFunctions) {
    feature.description = `A utility module that provides functionality for ${fileName}`;
  }

  // Generate technical documentation suggestions
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
