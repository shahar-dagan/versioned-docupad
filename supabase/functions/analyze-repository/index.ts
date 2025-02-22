
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

    const { repoFullName, productId, userId } = await req.json();
    console.log('Analyzing repository:', repoFullName, 'for product:', productId, 'requested by user:', userId);

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Ensure proper repository name format
    const [owner, repo] = repoFullName.split('/');
    if (!owner || !repo) {
      return new Response(
        JSON.stringify({ error: 'Invalid repository name format. Expected format: owner/repo' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // First, get the repository information
    console.log('Fetching repository information...');
    const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!repoResponse.ok) {
      const repoErrorText = await repoResponse.text();
      console.error('Repository response error:', repoErrorText);
      throw new Error(`GitHub API error: ${repoResponse.statusText} when fetching repository info. Details: ${repoErrorText}`);
    }

    const repoData = await repoResponse.json();
    
    // Check if repository is empty
    if (repoData.size === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'This repository appears to be empty. Please make sure you have committed some code to the repository before analyzing it.'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const defaultBranch = repoData.default_branch;
    console.log('Default branch:', defaultBranch);

    // Try to get contents using the contents API first
    console.log(`Fetching repository contents...`);
    const contentsResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents?ref=${defaultBranch}`, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!contentsResponse.ok) {
      const errorText = await contentsResponse.text();
      console.error('Contents response error:', errorText);
      
      // If repository is empty, return a friendly error message
      if (contentsResponse.status === 409) {
        return new Response(
          JSON.stringify({ 
            error: 'This repository appears to be empty. Please make sure you have committed some code to the repository before analyzing it.'
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      throw new Error(`GitHub API error: ${contentsResponse.statusText} when fetching contents. Details: ${errorText}`);
    }

    const contents = await contentsResponse.json();
    
    // Process the contents recursively to build a tree-like structure
    async function processDirectory(path = '') {
      const dirResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${defaultBranch}`, {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (!dirResponse.ok) {
        console.error(`Failed to fetch contents for path ${path}`);
        return [];
      }
      
      const items = await dirResponse.json();
      let allFiles = [];
      
      for (const item of items) {
        if (item.type === 'dir') {
          const subFiles = await processDirectory(item.path);
          allFiles = allFiles.concat(subFiles);
        } else if (item.type === 'file') {
          allFiles.push({
            path: item.path,
            sha: item.sha,
            type: 'blob'
          });
        }
      }
      
      return allFiles;
    }

    const allFiles = await processDirectory();
    console.log('Found files:', allFiles.length);

    // Filter relevant files
    const relevantFiles = allFiles
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
        try {
          const contentResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs/${file.sha}`, {
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
        } catch (error) {
          console.error(`Error fetching content for ${file.path}:`, error);
          return null;
        }
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

    // Call Claude API with updated request format
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-opus-20240229',
        messages: [{
          role: 'user',
          content: prompt
        }],
        max_tokens: 1000,
        temperature: 0.7,
        system: 'You are a software development expert. ONLY respond with valid JSON following the exact format specified in the user prompt. Do not include any additional text or explanations.'
      })
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.error('Claude API error response:', errorText);
      throw new Error(`Claude API error: ${claudeResponse.statusText}. Details: ${errorText}`);
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

    // Store features in database with author_id
    for (const feature of features) {
      const { error: insertError } = await supabase
        .from('features')
        .insert({
          product_id: productId,
          name: feature.name,
          description: feature.description,
          status: 'suggested',
          suggestions: feature.suggestions,
          author_id: userId
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
