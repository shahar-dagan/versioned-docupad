
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
    console.log('Starting new CodeQL analysis for:', { repoFullName, productId, userId });

    const githubToken = Deno.env.get('GITHUB_ACCESS_TOKEN');
    if (!githubToken) {
      throw new Error('GitHub token not found');
    }

    const headers = {
      'Authorization': `token ${githubToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Supabase-Edge-Function'
    };

    // First, check if the repository has Advanced Security enabled
    const repoResponse = await fetch(
      `https://api.github.com/repos/${repoFullName}`,
      { headers }
    );

    if (!repoResponse.ok) {
      throw new Error('Failed to access repository');
    }

    const repoData = await repoResponse.json();
    if (!repoData.security_and_analysis?.advanced_security?.status === 'enabled') {
      throw new Error('GitHub Advanced Security is not enabled for this repository');
    }

    // Create a new CodeQL workflow
    const workflowContent = {
      name: 'CodeQL Analysis',
      on: {
        workflow_dispatch: {},
        schedule: [{ cron: '0 0 * * 0' }] // Weekly analysis
      },
      jobs: {
        analyze: {
          name: 'Analyze',
          'runs-on': 'ubuntu-latest',
          permissions: {
            'security-events': 'write',
            actions: 'read',
            contents: 'read'
          },
          strategy: {
            fail-fast: false,
            matrix: {
              language: ['javascript']
            }
          },
          steps: [
            {
              name: 'Checkout repository',
              uses: 'actions/checkout@v3'
            },
            {
              name: 'Initialize CodeQL',
              uses: 'github/codeql-action/init@v2',
              with: {
                languages: '${{ matrix.language }}'
              }
            },
            {
              name: 'Perform CodeQL Analysis',
              uses: 'github/codeql-action/analyze@v2',
              with: {
                category: 'javascript-analysis'
              }
            }
          ]
        }
      }
    };

    // Create/update the workflow file in the repository
    const workflowPath = '.github/workflows/codeql-analysis.yml';
    const workflowResponse = await fetch(
      `https://api.github.com/repos/${repoFullName}/contents/${workflowPath}`,
      {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'Add/Update CodeQL analysis workflow',
          content: btoa(JSON.stringify(workflowContent, null, 2)),
          branch: 'main'
        })
      }
    );

    if (!workflowResponse.ok) {
      console.error('Failed to create workflow:', await workflowResponse.text());
      throw new Error('Failed to create CodeQL workflow');
    }

    // Trigger the workflow
    const triggerResponse = await fetch(
      `https://api.github.com/repos/${repoFullName}/actions/workflows/codeql-analysis.yml/dispatches`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ ref: 'main' })
      }
    );

    if (!triggerResponse.ok) {
      throw new Error('Failed to trigger CodeQL analysis');
    }

    // Wait for analysis to start (poll the workflow run status)
    let analysisStarted = false;
    let attempts = 0;
    while (!analysisStarted && attempts < 10) {
      const runsResponse = await fetch(
        `https://api.github.com/repos/${repoFullName}/actions/runs?event=workflow_dispatch`,
        { headers }
      );
      
      if (runsResponse.ok) {
        const runs = await runsResponse.json();
        if (runs.workflow_runs?.length > 0) {
          analysisStarted = true;
          console.log('CodeQL analysis started:', runs.workflow_runs[0].id);
        }
      }
      
      if (!analysisStarted) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between checks
      }
    }

    // Store analysis status in Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: analysisError } = await supabase
      .from('codeql_analyses')
      .insert({
        product_id: productId,
        repository_name: repoFullName,
        status: 'running',
        triggered_by: userId
      });

    if (analysisError) {
      throw analysisError;
    }

    return new Response(
      JSON.stringify({
        message: 'CodeQL analysis triggered successfully',
        status: 'running',
        analysisStarted
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
