
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const GITHUB_ACCESS_TOKEN = Deno.env.get('GITHUB_ACCESS_TOKEN');

interface RequestBody {
  repoFullName: string;
  productId: string;
  userId: string;
}

async function fetchRepoData(repoFullName: string) {
  const response = await fetch(`https://api.github.com/repos/${repoFullName}`, {
    headers: {
      'Authorization': `Bearer ${GITHUB_ACCESS_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.statusText}`);
  }
  
  return await response.json();
}

async function analyzeRepository(repoFullName: string) {
  console.log('Starting repository analysis for:', repoFullName);
  
  try {
    // Fetch repository metadata
    const repoData = await fetchRepoData(repoFullName);
    console.log('Repository metadata:', repoData);

    // Get repository languages
    const languagesResponse = await fetch(`https://api.github.com/repos/${repoFullName}/languages`, {
      headers: {
        'Authorization': `Bearer ${GITHUB_ACCESS_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    const languages = await languagesResponse.json();
    console.log('Repository languages:', languages);

    // Get recent commits
    const commitsResponse = await fetch(`https://api.github.com/repos/${repoFullName}/commits?per_page=10`, {
      headers: {
        'Authorization': `Bearer ${GITHUB_ACCESS_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    const commits = await commitsResponse.json();
    console.log('Recent commits:', commits);

    // Analyze and extract features based on the repository data
    const features = [];

    // Core functionality feature
    if (repoData.description) {
      features.push({
        name: 'Core Functionality',
        description: repoData.description,
        suggestions: [
          'Review and update project documentation',
          'Consider adding integration tests',
        ],
      });
    }

    // Languages and technologies feature
    const languagesList = Object.keys(languages);
    if (languagesList.length > 0) {
      features.push({
        name: 'Technical Stack',
        description: `Project primarily uses ${languagesList.join(', ')}`,
        suggestions: [
          'Consider adding type checking for JavaScript files',
          'Implement automated testing for main functionalities',
        ],
      });
    }

    // Recent development activity
    if (commits.length > 0) {
      const recentChanges = commits
        .slice(0, 5)
        .map((commit: any) => commit.commit.message)
        .filter((message: string) => message.length < 100);

      features.push({
        name: 'Recent Development',
        description: 'Based on recent commit history',
        suggestions: [
          'Consider implementing automated deployment',
          'Add more detailed commit messages',
        ],
        code_changes: recentChanges.map((message: string) => ({
          change_description: message,
          created_at: new Date().toISOString(),
        })),
      });
    }

    return features;
  } catch (error) {
    console.error('Error analyzing repository:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { repoFullName, productId, userId } = await req.json() as RequestBody;

    if (!GITHUB_ACCESS_TOKEN) {
      throw new Error('GitHub access token not configured');
    }

    if (!repoFullName || !productId || !userId) {
      throw new Error('Missing required parameters');
    }

    const features = await analyzeRepository(repoFullName);
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Store features in the database
    for (const feature of features) {
      const { error: insertError } = await supabaseClient
        .from('features')
        .insert({
          product_id: productId,
          name: feature.name,
          description: feature.description,
          suggestions: feature.suggestions,
          author_id: userId,
          status: 'active',
        });

      if (insertError) {
        console.error('Error inserting feature:', insertError);
        throw insertError;
      }
    }

    return new Response(
      JSON.stringify({ success: true, features }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});
