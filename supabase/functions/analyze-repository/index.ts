
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

    // Get tokens
    const [githubTokenResult, openAiTokenResult] = await Promise.all([
      supabase.from('secrets').select('value').eq('name', 'GITHUB_ACCESS_TOKEN').single(),
      supabase.from('secrets').select('value').eq('name', 'OPENAI_API_KEY').single()
    ]);

    if (githubTokenResult.error || !githubTokenResult.data?.value) {
      throw new Error('Failed to retrieve GitHub token');
    }
    if (openAiTokenResult.error || !openAiTokenResult.data?.value) {
      throw new Error('Failed to retrieve OpenAI token');
    }

    const githubToken = githubTokenResult.data.value;
    const openAiKey = openAiTokenResult.data.value;

    // Get repository details
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
      : 'https://api.github.com';

    // Fetch latest commit and code content
    const [commitResponse, contentResponse] = await Promise.all([
      fetch(`${baseUrl}/repos/${repoFullName}/commits`, {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }),
      fetch(`${baseUrl}/repos/${repoFullName}/contents`, {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      })
    ]);

    if (!commitResponse.ok || !contentResponse.ok) {
      throw new Error('Failed to fetch repository data');
    }

    const commits = await commitResponse.json();
    const contents = await contentResponse.json();
    const latestCommit = commits[0];

    // Start CodeQL analysis with specific queries
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
        queries: [
          'security-and-quality',
          'security-extended',
          'maintainability'
        ]
      }),
    });

    if (!analysisResponse.ok) {
      const error = await analysisResponse.text();
      console.error('CodeQL analysis failed:', error);
      throw new Error('Failed to start CodeQL analysis');
    }

    const analysis = await analysisResponse.json();

    // Use OpenAI to analyze the codebase structure and provide suggestions
    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert code reviewer focusing on security, maintainability, and best practices.'
          },
          {
            role: 'user',
            content: `Analyze this repository structure and provide specific suggestions for improvement:
              Repository: ${repoFullName}
              Latest Commit: ${latestCommit.sha}
              Files: ${JSON.stringify(contents)}
              CodeQL Analysis: ${JSON.stringify(analysis)}
            `
          }
        ],
      }),
    });

    if (!openAiResponse.ok) {
      throw new Error('Failed to get AI analysis');
    }

    const aiAnalysis = await openAiResponse.json();
    const suggestions = aiAnalysis.choices[0].message.content.split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => line.replace(/^[•\-]\s*/, '').trim());

    // Store combined analysis results
    const { error: insertError } = await supabase
      .from('codeql_analyses')
      .insert({
        product_id: productId,
        repository_id: repoFullName,
        analysis_date: new Date().toISOString(),
        summary: `CodeQL analysis completed for commit ${latestCommit.sha}`,
        analysis_results: analysis,
        ai_suggestions: suggestions
      });

    if (insertError) {
      throw new Error('Failed to store analysis results');
    }

    // Update the features table with suggestions
    const { error: updateError } = await supabase
      .from('features')
      .update({
        last_analyzed_at: new Date().toISOString(),
        suggestions: suggestions
      })
      .eq('product_id', productId);

    if (updateError) {
      console.error('Failed to update features with suggestions:', updateError);
    }

    return new Response(
      JSON.stringify({
        message: 'Analysis completed successfully',
        analysis,
        suggestions
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
})
