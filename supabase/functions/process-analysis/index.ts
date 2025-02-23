
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productId, userId } = await req.json();
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create a processing record
    const { data: analysis, error: analysisError } = await supabase
      .from('codeql_analyses')
      .insert({
        product_id: productId,
        status: 'running',
        progress: 0,
        steps: [],
        triggered_by: userId
      })
      .select()
      .single();

    if (analysisError) throw analysisError;

    // Update progress
    const updateProgress = async (step: string, progress: number) => {
      const { error } = await supabase
        .from('codeql_analyses')
        .update({ 
          progress,
          steps: [...(analysis.steps || []), { step, timestamp: new Date().toISOString() }]
        })
        .eq('id', analysis.id);

      if (error) console.error('Error updating progress:', error);
    };

    await updateProgress('Starting analysis processing', 10);
    
    // Fetch file analyses for the product
    const { data: fileAnalyses, error: fetchError } = await supabase
      .from('file_analyses')
      .select('*')
      .eq('product_id', productId);

    if (fetchError) throw fetchError;

    await updateProgress(`Found ${fileAnalyses?.length} file analyses to process`, 30);

    // Prepare the prompt for OpenAI
    const analysisContent = fileAnalyses?.map(analysis => {
      const summaries = analysis.feature_summaries?.features || [];
      return {
        file: analysis.file_path,
        features: summaries
      };
    });

    await updateProgress('Analyzing features with AI', 50);

    // Call OpenAI to process the analysis
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: `You are a technical analyst that helps identify and categorize features from code analysis results. 
            You must only respond with a valid JSON array of features.
            Combine similar functionalities across files into distinct features.
            Focus on user-facing features and core functionality.`
          },
          {
            role: 'user',
            content: `Based on these file analyses, create a JSON array of the main features of the application.
            Here's the analysis data: ${JSON.stringify(analysisContent, null, 2)}
            
            Your response must be a plain JSON array where each feature object has these exact fields:
            {
              "name": "string (short, clear name)",
              "description": "string (concise description)",
              "status": "active"
            }
            
            Do not include any other text or markdown formatting in your response, just the JSON array.`
          }
        ],
        temperature: 0.5,
      }),
    });

    await updateProgress('Processing AI response', 70);

    const aiResponse = await response.json();
    let features;
    try {
      features = JSON.parse(aiResponse.choices[0].message.content.trim());
    } catch (e) {
      console.error('Failed to parse OpenAI response:', e);
      throw new Error('Failed to parse feature list from OpenAI response');
    }

    if (!Array.isArray(features)) {
      throw new Error('OpenAI response is not an array of features');
    }

    await updateProgress('Creating features in database', 90);

    // Insert the generated features into the database
    for (const feature of features) {
      const { error: insertError } = await supabase
        .from('features')
        .insert({
          name: feature.name,
          description: feature.description,
          status: feature.status || 'active',
          product_id: productId,
          author_id: userId, // Now properly setting the author_id
        });

      if (insertError) {
        console.error('Error inserting feature:', insertError);
        throw insertError;
      }
    }

    // Mark processing as complete
    await updateProgress('Processing completed', 100);
    await supabase
      .from('codeql_analyses')
      .update({ status: 'completed' })
      .eq('id', analysis.id);

    return new Response(JSON.stringify({ success: true, features }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing analysis:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
