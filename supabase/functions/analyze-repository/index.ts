
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')!;
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const githubToken = Deno.env.get('GITHUB_ACCESS_TOKEN')!;

    const { repoFullName, productId } = await req.json();
    console.log('Analyzing repository:', repoFullName, 'for product:', productId);

    // Initialize Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get repository tree from GitHub API
    console.log('Fetching repository tree from GitHub...');
    const treeResponse = await fetch(`https://api.github.com/repos/${repoFullName}/git/trees/main?recursive=1`, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    let treeData;
    if (!treeResponse.ok) {
      // If main branch doesn't exist, try master
      console.log('Main branch not found, trying master branch...');
      const masterTreeResponse = await fetch(`https://api.github.com/repos/${repoFullName}/git/trees/master?recursive=1`, {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!masterTreeResponse.ok) {
        throw new Error(`GitHub API error: ${masterTreeResponse.statusText}`);
      }

      treeData = await masterTreeResponse.json();
    } else {
      treeData = await treeResponse.json();
    }

    console.log('Found repository tree with', treeData.tree.length, 'items');
    
    // Filter relevant files
    const relevantFiles = treeData.tree
      .filter((item: any) => {
        return item.type === 'blob' && (
          item.path.endsWith('.ts') ||
          item.path.endsWith('.tsx') ||
          item.path.endsWith('.js') ||
          item.path.endsWith('.jsx') ||
          item.path.endsWith('.md') ||
          item.path.includes('package.json') ||
          item.path.includes('README')
        );
      })
      .slice(0, 10); // Limit to 10 files for initial analysis

    console.log('Found relevant files:', relevantFiles.map((f: any) => f.path));

    if (relevantFiles.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No relevant files found in repository. Please ensure your repository contains TypeScript, JavaScript, or documentation files.'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Fetch content for each file
    const fileContents: RepoFile[] = await Promise.all(
      relevantFiles.map(async (file: any) => {
        console.log(`Fetching content for ${file.path}`);
        const contentResponse = await fetch(`https://api.github.com/repos/${repoFullName}/git/blobs/${file.sha}`, {
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        
        if (!contentResponse.ok) {
          console.error(`Failed to fetch content for ${file.path}:`, await contentResponse.text());
          return null;
        }
        
        const contentData = await contentResponse.json();
        // GitHub returns base64 encoded content
        const content = atob(contentData.content);
        return { name: file.path, content };
      })
    );

    // Filter out any null results from failed fetches
    const validFiles = fileContents.filter((f): f is RepoFile => f !== null);

    if (validFiles.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch content for any files in the repository' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Prepare prompt for Claude
    const fileDescriptions = validFiles
      .map(file => `File: ${file.name}\n\nContent:\n${file.content}\n---\n`)
      .join('\n');

    const prompt = `You are a software development expert. Please analyze these files from a GitHub repository and identify 3-5 key features. Your response must be ONLY a JSON array of objects, with no additional text or explanation. Each object should have these exact fields:
- name: string (feature name)
- description: string (what it does)
- suggestions: string[] (array of improvement suggestions)

Example response format:
[
  {
    "name": "Feature Name",
    "description": "Feature description",
    "suggestions": ["Suggestion 1", "Suggestion 2"]
  }
]

Here are the files to analyze:

${fileDescriptions}`;

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
          role: 'system',
          content: 'You are a software development expert. ONLY respond with valid JSON following the exact format specified in the user prompt. Do not include any additional text or explanations.'
        }, {
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
      // Extract the content from Claude's response and attempt to parse it as JSON
      const responseText = analysisResult.content[0].text.trim();
      console.log('Attempting to parse response:', responseText);
      features = JSON.parse(responseText);

      // Validate the response structure
      if (!Array.isArray(features)) {
        throw new Error('Response is not an array');
      }

      // Validate each feature object
      features.forEach((feature, index) => {
        if (!feature.name || !feature.description || !Array.isArray(feature.suggestions)) {
          throw new Error(`Invalid feature object at index ${index}`);
        }
      });
    } catch (error) {
      console.error('Error parsing Claude response:', error);
      console.log('Raw response:', analysisResult.content[0].text);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to parse Claude response. Please try again.',
          details: error.message,
          rawResponse: analysisResult.content[0].text
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Successfully parsed features:', features);

    // Store features in database
    for (const feature of features) {
      const { error: insertError } = await supabase
        .from('features')
        .insert({
          product_id: productId,
          name: feature.name,
          description: feature.description,
          status: 'suggested',
          suggestions: feature.suggestions
        });

      if (insertError) {
        console.error('Error inserting feature:', insertError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, features }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in analyze-repository function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
