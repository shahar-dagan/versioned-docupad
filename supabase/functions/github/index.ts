
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.fresh.dev/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GithubRepo {
  id: number;
  name: string;
  html_url: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const token = Deno.env.get('GITHUB_ACCESS_TOKEN')
    if (!token) {
      throw new Error('GitHub token not found')
    }

    const { data: { user } } = await supabase.auth.getUser(
      req.headers.get('Authorization')?.split('Bearer ')[1] ?? ''
    )

    if (!user) {
      throw new Error('No user found')
    }

    // Get repositories from GitHub
    const response = await fetch('https://api.github.com/user/repos', {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch GitHub repositories')
    }

    const repos: GithubRepo[] = await response.json()
    
    return new Response(
      JSON.stringify({
        repos: repos.map(repo => ({
          id: repo.id.toString(),
          name: repo.name,
          url: repo.html_url
        }))
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
