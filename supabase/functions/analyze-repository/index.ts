
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { repoFullName, productId, userId } = await req.json();
    console.log('Starting analysis with params:', { repoFullName, productId, userId });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    console.log('Initializing Supabase client with URL:', supabaseUrl);
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get GitHub token from secrets table with detailed logging
    console.log('Fetching GitHub token from secrets table...');
    const { data: secretData, error: secretError } = await supabase
      .from('secrets')
      .select('value')
      .eq('name', 'GITHUB_ACCESS_TOKEN')
      .maybeSingle();

    if (secretError) {
      console.error('Error fetching GitHub token:', secretError);
      throw new Error('Failed to fetch GitHub token: ' + secretError.message);
    }

    if (!secretData?.value) {
      console.error('No GitHub token found or token is empty');
      throw new Error('GitHub token not found or is empty');
    }

    const githubToken = secretData.value.trim(); // Trim any whitespace
    console.log('Token validation:', {
      length: githubToken.length,
      startsWithGh: githubToken.startsWith('gh'),
      startsWithGhp: githubToken.startsWith('ghp'),
      containsWhitespace: /\s/.test(githubToken)
    });

    // Verify token format
    if (githubToken.length < 30) { // GitHub tokens are typically longer
      throw new Error('GitHub token appears to be malformed (too short)');
    }

    // Analyze files in the repository
    const analyzeFiles = async () => {
      console.log(`Fetching contents of repository: ${repoFullName}`);
      
      // Test GitHub API authentication first
      const testResponse = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Supabase-Edge-Function'
        },
      });

      if (!testResponse.ok) {
        const errorText = await testResponse.text();
        console.error('GitHub API authentication test failed:', {
          status: testResponse.status,
          statusText: testResponse.statusText,
          headers: Object.fromEntries(testResponse.headers.entries()),
          error: errorText
        });
        throw new Error('GitHub API authentication failed');
      }

      console.log('GitHub API authentication successful, proceeding with repository fetch');

      const response = await fetch(`https://api.github.com/repos/${repoFullName}/contents`, {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Supabase-Edge-Function'
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('GitHub API error details:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          error: errorText
        });
        throw new Error(`Failed to fetch repository contents: ${response.statusText}`);
      }

      const contents = await response.json();
      console.log(`Found ${contents.length} files/directories in repository`);
      
      const features = [];

      // Process only typescript/javascript files
      for (const item of contents) {
        if (item.type === 'file' && 
            (item.name.endsWith('.ts') || 
             item.name.endsWith('.tsx') || 
             item.name.endsWith('.js') || 
             item.name.endsWith('.jsx'))) {
          
          console.log(`Analyzing file: ${item.path}`);
          const fileResponse = await fetch(item.download_url);
          
          if (!fileResponse.ok) {
            console.warn(`Failed to fetch file ${item.path}:`, fileResponse.statusText);
            continue;
          }

          const content = await fileResponse.text();
          console.log(`Successfully fetched content for ${item.path}`);
          
          // Simple feature detection based on common patterns
          const feature = {
            name: item.name.replace(/\.(tsx?|jsx?)$/, ''),
            description: `Component or module from ${item.path}`,
            interactions: [],
          };

          // Detect React components
          if (content.includes('export default') || content.includes('export function')) {
            feature.interactions.push('Component definition found');
          }

          // Detect event handlers
          if (content.includes('onClick=') || content.includes('onChange=')) {
            feature.interactions.push('User interaction handlers detected');
          }

          // Detect forms
          if (content.includes('<form') || content.includes('handleSubmit')) {
            feature.interactions.push('Form handling detected');
          }

          console.log(`Analysis complete for ${item.path}:`, feature.interactions);

          features.push({
            product_id: productId,
            name: feature.name,
            description: feature.description,
            author_id: userId,
            status: 'active',
            suggestions: feature.interactions,
            last_analyzed_at: new Date().toISOString(),
          });
        }
      }

      return features;
    };

    console.log('Starting repository analysis process...');
    const features = await analyzeFiles();
    console.log(`Analysis complete, found ${features.length} features`);

    // Store the features
    if (features.length > 0) {
      console.log('Storing features in database...');
      const { error: insertError } = await supabase
        .from('features')
        .upsert(features);

      if (insertError) {
        console.error('Failed to store features:', insertError);
        throw insertError;
      }
      console.log('Successfully stored features in database');
    }

    return new Response(
      JSON.stringify({ 
        message: 'Analysis completed successfully',
        featuresAnalyzed: features.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in analyze-repository function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
