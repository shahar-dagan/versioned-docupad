
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

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
    console.log('Starting repository analysis for:', { repoFullName, productId, userId });

    const githubToken = Deno.env.get('GITHUB_ACCESS_TOKEN');
    const openAIKey = Deno.env.get('OPENAI_API_KEY');

    if (!githubToken) {
      throw new Error('GitHub token not found');
    }
    if (!openAIKey) {
      throw new Error('OpenAI API key not found');
    }

    const headers = {
      'Authorization': `token ${githubToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Supabase-Edge-Function'
    };

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Get repository content
    const contentResponse = await fetch(
      `https://api.github.com/repos/${repoFullName}/git/trees/main?recursive=1`,
      { headers }
    );

    if (!contentResponse.ok) {
      console.error('Failed to fetch repo content:', await contentResponse.text());
      throw new Error('Failed to access repository content');
    }

    const contentData = await contentResponse.json();
    const files = contentData.tree.filter((item: any) => 
      item.type === 'blob' && 
      (item.path.endsWith('.ts') || item.path.endsWith('.tsx') || item.path.endsWith('.js') || item.path.endsWith('.jsx'))
    );

    // 2. Fetch and analyze key files
    const fileContents = [];
    for (const file of files.slice(0, 5)) { // Limit to 5 files for initial analysis
      const fileResponse = await fetch(
        `https://api.github.com/repos/${repoFullName}/contents/${file.path}`,
        { headers }
      );
      
      if (fileResponse.ok) {
        const fileData = await fileResponse.json();
        const content = atob(fileData.content);
        fileContents.push({ path: file.path, content });
      }
    }

    // 3. Analyze with OpenAI
    const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a code analyst that identifies distinct features from React/TypeScript code. Return a JSON array of features, where each feature has: name, description, and suggested improvements.'
          },
          {
            role: 'user',
            content: `Analyze these files and identify key features:\n\n${fileContents.map(f => `${f.path}:\n${f.content}\n`).join('\n')}`
          }
        ],
      }),
    });

    const analysisData = await analysisResponse.json();
    const features = JSON.parse(analysisData.choices[0].message.content);

    // 4. Store features in database
    for (const feature of features) {
      const { error: featureError } = await supabase
        .from('features')
        .insert([
          {
            name: feature.name,
            description: feature.description,
            product_id: productId,
            author_id: userId,
            status: 'active',
            suggestions: feature.suggestions || [],
            last_analyzed_at: new Date().toISOString(),
          }
        ]);

      if (featureError) {
        console.error('Error creating feature:', featureError);
      }
    }

    // 5. Also get CodeQL alerts
    const alertsResponse = await fetch(
      `https://api.github.com/repos/${repoFullName}/code-scanning/alerts`,
      { headers }
    );

    let alerts = [];
    if (alertsResponse.ok) {
      alerts = await alertsResponse.json();
      console.log(`Found ${alerts.length} CodeQL alerts`);
    }

    // Store analysis results
    const { error: analysisError } = await supabase
      .from('codeql_analyses')
      .insert({
        product_id: productId,
        repository_name: repoFullName,
        status: 'completed',
        triggered_by: userId,
        analysis_results: {
          alerts,
          features,
          analyzed_files: fileContents.map(f => f.path),
          timestamp: new Date().toISOString()
        }
      });

    if (analysisError) {
      console.error('Error storing analysis:', analysisError);
    }

    return new Response(
      JSON.stringify({
        message: 'Repository analysis completed',
        featuresFound: features.length,
        alertsFound: alerts.length,
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
