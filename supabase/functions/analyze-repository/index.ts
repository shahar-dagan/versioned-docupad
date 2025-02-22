
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get repository content from GitHub
    const repoUrl = `https://api.github.com/repos/${repoFullName}/contents`;
    const response = await fetch(repoUrl);
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
            content: `You are a code analysis tool that identifies features in repositories.
            You MUST respond with a valid JSON array of features.
            Each feature MUST have exactly these fields:
            - name (string): short feature name
            - description (string): detailed description
            - suggestions (string[]): array of improvement suggestions`
          },
          {
            role: 'user',
            content: `Analyze this repository structure and list the main features as JSON:
              ${JSON.stringify(files, null, 2)}`
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      }),
    });

    const aiData = await openAIResponse.json();
    console.log('OpenAI response:', aiData);

    let features;
    try {
      features = JSON.parse(aiData.choices[0].message.content).features;
      if (!Array.isArray(features)) {
        throw new Error('Features must be an array');
      }
    } catch (error) {
      console.error('Failed to parse OpenAI response:', error);
      throw new Error('Failed to parse features from AI response');
    }

    console.log('Parsed features:', features);

    // Insert features into database
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
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Repository analyzed successfully',
      featuresCreated: features.length
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
