
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RepoFile {
  name: string;
  content: string;
}

serve(async (req) => {
  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')!;
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const githubToken = Deno.env.get('GITHUB_ACCESS_TOKEN')!;

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productId } = await req.json();
    console.log('Analyzing repository for product:', productId);

    // Initialize Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get repository information
    const { data: repoData } = await supabase
      .from('github_repositories')
      .select('repository_name')
      .eq('product_id', productId)
      .single();

    if (!repoData) {
      throw new Error('No repository found for this product');
    }

    console.log('Found repository:', repoData.repository_name);

    // Get repository files from GitHub API
    const response = await fetch(`https://api.github.com/repos/${repoData.repository_name}/contents`, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    const files = await response.json();

    // Filter and fetch content of relevant files
    const relevantFiles = files
      .filter((file: any) => file.type === 'file' && 
        (file.name.endsWith('.ts') || 
         file.name.endsWith('.tsx') || 
         file.name.endsWith('.js') || 
         file.name.endsWith('.jsx')))
      .slice(0, 5); // Limit to 5 files for initial analysis

    console.log('Processing files:', relevantFiles.map((f: any) => f.name));

    const fileContents: RepoFile[] = await Promise.all(
      relevantFiles.map(async (file: any) => {
        const contentResponse = await fetch(file.download_url, {
          headers: {
            'Authorization': `Bearer ${githubToken}`,
          }
        });
        const content = await contentResponse.text();
        return { name: file.name, content };
      })
    );

    // Prepare prompt for Claude
    const fileDescriptions = fileContents
      .map(file => `File: ${file.name}\n\nContent:\n${file.content}\n---\n`)
      .join('\n');

    const prompt = `You are a software development expert. Analyze these files from a GitHub repository:

${fileDescriptions}

Based on the code, identify 3-5 key features this software offers or could offer. For each feature:
1. Give it a clear, concise name
2. Write a brief description of what it does or could do
3. Suggest potential improvements or enhancements

Format your response as a JSON array of objects with "name", "description", and "suggestions" fields. Be specific and technical but clear.`;

    console.log('Calling Claude API...');

    // Call Claude API
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-opus-20240229',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!claudeResponse.ok) {
      throw new Error(`Claude API error: ${claudeResponse.statusText}`);
    }

    const analysisResult = await claudeResponse.json();
    console.log('Claude response:', analysisResult);

    let features;
    try {
      features = JSON.parse(analysisResult.content[0].text);
    } catch (error) {
      console.error('Error parsing Claude response:', error);
      console.log('Raw response:', analysisResult.content[0].text);
      throw new Error('Failed to parse Claude response');
    }

    console.log('Parsed features:', features);

    // Store features in database
    for (const feature of features) {
      const { error } = await supabase
        .from('features')
        .insert({
          product_id: productId,
          name: feature.name,
          description: feature.description,
          status: 'suggested',
          suggestions: feature.suggestions
        });

      if (error) {
        console.error('Error inserting feature:', error);
      }
    }

    return new Response(JSON.stringify({ success: true, features }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analyze-repository function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
