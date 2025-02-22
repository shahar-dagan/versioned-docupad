
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const githubToken = Deno.env.get('GITHUB_ACCESS_TOKEN');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { repoFullName, productId, userId } = await req.json();
    console.log('Analyzing repository:', { repoFullName, productId, userId });

    if (!repoFullName || !productId || !userId) {
      throw new Error('Missing required parameters');
    }

    if (!githubToken) {
      throw new Error('GitHub access token not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get repository content from GitHub with authentication
    const repoUrl = `https://api.github.com/repos/${repoFullName}/contents`;
    console.log('Fetching from GitHub URL:', repoUrl);
    
    const response = await fetch(repoUrl, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Docupad-App'
      }
    });
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error('GitHub API error details:', errorBody);
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }
    
    const files = await response.json();
    console.log('Files fetched from GitHub:', files);

    // Analyze repository structure with OpenAI
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a code analysis tool. Respond ONLY with a valid JSON object that has a "features" array. Each feature object must have "name" (string), "description" (string), and "suggestions" (string array). Example: {"features": [{"name": "Authentication", "description": "User login system", "suggestions": ["Add 2FA"]}]}'
          },
          {
            role: 'user',
            content: `Analyze this repository structure and output ONLY a JSON object with features array: ${JSON.stringify(files, null, 2)}`
          }
        ],
        temperature: 0,
        response_format: { type: "json_object" }
      }),
    });

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${openAIResponse.status} ${openAIResponse.statusText}`);
    }

    const aiData = await openAIResponse.json();
    console.log('Raw OpenAI response:', aiData);

    if (!aiData.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from OpenAI');
    }

    let parsedContent;
    try {
      parsedContent = JSON.parse(aiData.choices[0].message.content);
      console.log('Parsed OpenAI content:', parsedContent);
    } catch (error) {
      console.error('JSON parse error:', error);
      console.error('Raw content that failed to parse:', aiData.choices[0].message.content);
      throw new Error('Failed to parse OpenAI response as JSON');
    }

    if (!parsedContent.features || !Array.isArray(parsedContent.features)) {
      throw new Error('OpenAI response missing features array');
    }

    const features = parsedContent.features;
    console.log('Features to be inserted:', features);

    let featuresCreated = 0;
    for (const feature of features) {
      if (!feature.name || !feature.description || !Array.isArray(feature.suggestions)) {
        console.error('Invalid feature format:', feature);
        continue;
      }

      const { error } = await supabase
        .from('features')
        .insert([{
          name: feature.name,
          description: feature.description,
          suggestions: feature.suggestions,
          product_id: productId,
          author_id: userId,
          status: 'active',
        }]);

      if (error) {
        console.error('Error inserting feature:', error);
        throw error;
      }
      featuresCreated++;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Repository analyzed successfully',
      featuresCreated
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-repository function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
