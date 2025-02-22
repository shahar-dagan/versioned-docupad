
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { repoFullName, productId, userId } = await req.json();
    console.log('Analyzing repository:', { repoFullName, productId, userId });

    // Get GitHub token from Edge Function secrets
    const githubToken = Deno.env.get('GITHUB_ACCESS_TOKEN');
    if (!githubToken) {
      throw new Error('GitHub token not found in environment variables');
    }

    // Test GitHub API authentication
    const authResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Supabase-Edge-Function'
      },
    });

    if (!authResponse.ok) {
      console.error('GitHub authentication failed:', await authResponse.text());
      throw new Error('Failed to authenticate with GitHub API');
    }

    console.log('Successfully authenticated with GitHub');

    // Proceed with repository analysis
    const response = await fetch(`https://api.github.com/repos/${repoFullName}/contents`, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Supabase-Edge-Function'
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GitHub API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Repository access failed: ${response.statusText}`);
    }

    const contents = await response.json();
    console.log(`Found ${contents.length} files/directories in repository`);
    
    const features = [];
    for (const item of contents) {
      if (item.type === 'file' && 
          (item.name.endsWith('.ts') || 
           item.name.endsWith('.tsx') || 
           item.name.endsWith('.js') || 
           item.name.endsWith('.jsx'))) {
        
        console.log(`Analyzing file: ${item.path}`);
        const fileResponse = await fetch(item.download_url, {
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Supabase-Edge-Function'
          }
        });
        
        if (!fileResponse.ok) {
          console.warn(`Failed to fetch file ${item.path}:`, fileResponse.statusText);
          continue;
        }

        const content = await fileResponse.text();
        
        const feature = {
          name: item.name.replace(/\.(tsx?|jsx?)$/, ''),
          description: `Component or module from ${item.path}`,
          interactions: [],
        };

        if (content.includes('export default') || content.includes('export function')) {
          feature.interactions.push('Component definition found');
        }
        if (content.includes('onClick=') || content.includes('onChange=')) {
          feature.interactions.push('User interaction handlers detected');
        }
        if (content.includes('<form') || content.includes('handleSubmit')) {
          feature.interactions.push('Form handling detected');
        }

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

    console.log(`Analysis complete, found ${features.length} features`);

    // Need Supabase client to store the features
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (features.length > 0) {
      const { error: insertError } = await supabase
        .from('features')
        .upsert(features);

      if (insertError) {
        throw insertError;
      }
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
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
