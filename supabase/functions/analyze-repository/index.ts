
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

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
    console.log('Starting CodeQL analysis check for:', { repoFullName, productId, userId });

    const githubToken = Deno.env.get('GITHUB_ACCESS_TOKEN');
    if (!githubToken) {
      throw new Error('GitHub token not found');
    }

    const headers = {
      'Authorization': `token ${githubToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Supabase-Edge-Function'
    };

    // Check if repository exists and is accessible
    const repoResponse = await fetch(
      `https://api.github.com/repos/${repoFullName}`,
      { headers }
    );

    if (!repoResponse.ok) {
      throw new Error('Failed to access repository');
    }

    // Instead of creating a workflow, check for existing CodeQL alerts
    const alertsResponse = await fetch(
      `https://api.github.com/repos/${repoFullName}/code-scanning/alerts`,
      { headers }
    );

    let alerts = [];
    if (alertsResponse.ok) {
      alerts = await alertsResponse.json();
      console.log(`Found ${alerts.length} existing CodeQL alerts`);
    } else {
      console.log('No existing CodeQL alerts found or access denied');
    }

    // Store analysis attempt in Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: analysisError } = await supabase
      .from('codeql_analyses')
      .insert({
        product_id: productId,
        repository_name: repoFullName,
        status: 'completed',
        triggered_by: userId
      });

    if (analysisError) {
      throw analysisError;
    }

    // For repositories without CodeQL setup, provide instructions
    const setupInstructions = !alerts.length ? {
      message: 'No CodeQL alerts found. To enable CodeQL analysis:',
      steps: [
        '1. Go to your repository Settings > Security & analysis',
        '2. Enable "Code scanning"',
        '3. Choose "CodeQL Analysis" as the scanning tool',
        '4. Configure the default CodeQL workflow'
      ]
    } : null;

    return new Response(
      JSON.stringify({
        message: 'Repository analysis completed',
        alertsFound: alerts.length,
        setupInstructions,
        status: 'completed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in analyze-repository function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
