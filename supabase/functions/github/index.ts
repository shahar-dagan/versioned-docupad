
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const GITHUB_API_URL = 'https://api.github.com';

serve(async (req: Request) => {
  try {
    const githubToken = Deno.env.get('GITHUB_ACCESS_TOKEN');
    
    if (!githubToken) {
      return new Response(
        JSON.stringify({ error: 'GitHub token not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get authenticated user's repositories
    const response = await fetch(`${GITHUB_API_URL}/user/repos?sort=updated`, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    const repositories = await response.json();
    
    // Transform the data to match our interface
    const repos = repositories.map((repo: any) => ({
      id: repo.id.toString(),
      name: repo.full_name,
      url: repo.html_url,
    }));

    return new Response(
      JSON.stringify({ repos }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
        } 
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        } 
      }
    );
  }
});
