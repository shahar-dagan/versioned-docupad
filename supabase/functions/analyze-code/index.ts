
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Octokit } from "https://esm.sh/octokit";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get request body
    const { repository } = await req.json();
    console.log('Analyzing repository:', repository);

    if (!repository) {
      throw new Error('Repository name is required');
    }

    // Initialize GitHub client
    const githubToken = Deno.env.get('GITHUB_ACCESS_TOKEN');
    if (!githubToken) {
      throw new Error('GitHub token not configured');
    }

    const octokit = new Octokit({ auth: githubToken });
    const [owner, repo] = repository.split('/');

    // Create a temporary fork under our analyzer account
    console.log(`Creating temporary fork of ${owner}/${repo}`);
    const forkResponse = await octokit.rest.repos.createFork({
      owner,
      repo,
      organization: 'your-analyzer-org', // You'll need to create this organization
      name: `${repo}-analysis-${Date.now()}`,
    });

    if (!forkResponse.data) {
      throw new Error('Failed to create fork');
    }

    const forkOwner = forkResponse.data.owner.login;
    const forkName = forkResponse.data.name;

    // Wait for fork to be ready (GitHub needs some time)
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Configure DeepSource for the fork
    const deepsourceKey = Deno.env.get('DEEPSOURCE_API_KEY');
    if (!deepsourceKey) {
      throw new Error('DeepSource API key not configured');
    }

    // Activate repository in DeepSource
    const activateResponse = await fetch('https://api.deepsource.io/v1/repos/activate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepsourceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        repository: `${forkOwner}/${forkName}`,
        vcs_provider: 'github',
      }),
    });

    if (!activateResponse.ok) {
      throw new Error('Failed to activate repository in DeepSource');
    }

    // Trigger analysis
    const analysisResponse = await fetch(`https://api.deepsource.io/v1/analyses/${forkOwner}/${forkName}/trigger`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepsourceKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!analysisResponse.ok) {
      throw new Error('Failed to trigger DeepSource analysis');
    }

    // Schedule fork cleanup (after 1 hour)
    setTimeout(async () => {
      try {
        await octokit.rest.repos.delete({
          owner: forkOwner,
          repo: forkName,
        });
        console.log(`Cleaned up temporary fork: ${forkOwner}/${forkName}`);
      } catch (error) {
        console.error('Error cleaning up fork:', error);
      }
    }, 3600000); // 1 hour

    return new Response(
      JSON.stringify({
        message: 'Analysis started successfully',
        repository: `${forkOwner}/${forkName}`,
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
