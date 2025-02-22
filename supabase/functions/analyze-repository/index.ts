
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from '@supabase/supabase-js';

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

    // Create a test feature to verify the function is working
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
            content: 'You are an expert software architect. Analyze the repository structure and identify main features.'
          },
          {
            role: 'user',
            content: `Analyze this repository structure and identify the main features:
              ${JSON.stringify(files, null, 2)}
              
              Format your response as a JSON array of features, where each feature has:
              - name: short feature name
              - description: detailed description
              - suggestions: array of improvement suggestions`
          }
        ],
      }),
    });

    const aiData = await openAIResponse.json();
    const features = JSON.parse(aiData.choices[0].message.content);

    // Insert features into database
    for (const feature of features) {
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

      if (error) throw error;
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
