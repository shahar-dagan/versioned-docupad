
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  repoFullName: string;
  productId: string;
  userId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { repoFullName, productId, userId } = await req.json() as RequestBody;
    console.log('Analyzing repository:', repoFullName, 'for product:', productId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get GitHub token
    const { data: { value: githubToken }, error: tokenError } = await supabase
      .from('secrets')
      .select('value')
      .eq('name', 'GITHUB_ACCESS_TOKEN')
      .single();

    if (tokenError || !githubToken) {
      throw new Error('Failed to retrieve GitHub token');
    }

    // Initialize GitHub API client
    const githubApi = 'https://api.github.com';
    
    // Get repository details to check if it's an enterprise repo
    const { data: repoData, error: repoError } = await supabase
      .from('github_repositories')
      .select('enterprise_url, enterprise_enabled')
      .eq('repository_name', repoFullName)
      .single();

    if (repoError) {
      throw new Error('Failed to get repository details');
    }

    const baseUrl = repoData.enterprise_enabled && repoData.enterprise_url 
      ? `${repoData.enterprise_url}/api/v3`
      : githubApi;

    // Fetch latest commit
    const commitResponse = await fetch(`${baseUrl}/repos/${repoFullName}/commits`, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!commitResponse.ok) {
      throw new Error('Failed to fetch repository commits');
    }

    const commits = await commitResponse.json();
    const latestCommit = commits[0];

    // Start CodeQL analysis
    const analysisResponse = await fetch(`${baseUrl}/repos/${repoFullName}/code-scanning/analyses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        ref: latestCommit.sha,
        tool_name: 'CodeQL',
        analysis_key: `codeql-${Date.now()}`,
      }),
    });

    if (!analysisResponse.ok) {
      const error = await analysisResponse.text();
      console.error('CodeQL analysis failed:', error);
      throw new Error('Failed to start CodeQL analysis');
    }

    const analysis = await analysisResponse.json();

    // Store analysis information
    const { error: insertError } = await supabase
      .from('codeql_analyses')
      .insert({
        product_id: productId,
        repository_id: repoFullName,
        analysis_date: new Date().toISOString(),
        summary: `CodeQL analysis started for commit ${latestCommit.sha}`,
        analysis_results: analysis,
      });

    if (insertError) {
      throw new Error('Failed to store analysis results');
    }

    return new Response(
      JSON.stringify({ message: 'Analysis started successfully', analysis }),
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
})
