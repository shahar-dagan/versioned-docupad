
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch GitHub token
    const { data: secretData, error: secretError } = await supabase
      .from('secrets')
      .select('value')
      .eq('name', 'GITHUB_ACCESS_TOKEN')
      .maybeSingle();

    if (secretError || !secretData?.value) {
      throw new Error('GitHub token not available: ' + (secretError?.message || 'Token not found'));
    }

    const githubToken = secretData.value.trim();
    console.log('Token length:', githubToken.length);

    // Test GitHub API with user endpoint
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitHub-Test'
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('GitHub API error:', {
        status: response.status,
        statusText: response.statusText,
        data
      });
      throw new Error(`GitHub API test failed: ${data.message}`);
    }

    return new Response(
      JSON.stringify({
        message: 'GitHub API test successful',
        user: {
          login: data.login,
          name: data.name,
          type: data.type
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in github-test function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
