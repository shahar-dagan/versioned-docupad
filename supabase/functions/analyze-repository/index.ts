
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

    // Get access token from Supabase secrets
    const { data: { secret: githubToken }, error: secretError } = await supabaseClient
      .from('secrets')
      .select('secret')
      .eq('name', 'GITHUB_ACCESS_TOKEN')
      .single()

    if (secretError || !githubToken) {
      console.error('Failed to get GitHub token:', secretError);
      return new Response(
        JSON.stringify({ error: 'Failed to get GitHub access token' }),
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
        
        // Extract potential features from file content
        const fileFeatures = extractFeatures(content, item.name);
        features.push(...fileFeatures);
      }
    }

    console.log(`Extracted ${features.length} features`);
    return features;
  } catch (error) {
    console.error('Error processing repository contents:', error);
    throw error;
  }
}

function extractFeatures(content: string, fileName: string) {
  const features = [];
  
  // Extract component name from file name
  const componentName = fileName.replace(/\.[^/.]+$/, '');
  
  // Basic feature extraction logic
  if (content.includes('export') || content.includes('function')) {
    features.push({
      name: `${componentName} Component`,
      description: `A component found in ${fileName}`,
      suggestions: [
        'Review component documentation',
        'Add unit tests',
        'Consider performance optimizations'
      ]
    });
  }
  
  return features;
}
