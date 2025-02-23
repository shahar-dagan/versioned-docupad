
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
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

    // Update progress function
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

    await updateProgress(`Found ${fileAnalyses?.length || 0} file analyses to process`, 30);

    // Prepare the prompt for OpenAI
    const analysisContent = fileAnalyses?.map(analysis => {
      const summaries = analysis.feature_summaries?.features || [];
      return {
        file: analysis.file_path,
        features: summaries
      };
    });

    await updateProgress('Analyzing features with AI', 50);

    // Call OpenAI with proper error handling
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

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
            content: 'You are a technical analyst. You must respond ONLY with a valid JSON array containing features. Do not include any explanations, markdown formatting, or additional text.'
          },
          {
            role: 'user',
            content: `Extract unique features from this analysis data:
${JSON.stringify(analysisContent, null, 2)}

Your response must be ONLY a valid JSON array where each object has exactly these fields:
{
  "name": "string describing the feature name",
  "description": "string describing what the feature does",
  "status": "active"
}`
          }
        ],
        temperature: 0.1, // Lower temperature for more consistent output
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API returned status ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log('Raw OpenAI response:', aiResponse); // Debug log

    if (!aiResponse.choices?.[0]?.message?.content) {
      console.error('Invalid OpenAI response structure:', aiResponse);
      throw new Error('Invalid response from OpenAI API');
    }

    await updateProgress('Processing AI response', 70);

    let features;
    try {
      const content = aiResponse.choices[0].message.content.trim();
      console.log('Raw content:', content); // Debug log
      
      // Remove any potential markdown or code block formatting
      const cleanContent = content
        .replace(/^```(?:json)?\n?/, '') // Remove opening code block
        .replace(/\n?```$/, '')          // Remove closing code block
        .trim();
      
      console.log('Cleaned content:', cleanContent); // Debug log
      
      features = JSON.parse(cleanContent);
      console.log('Parsed features:', features); // Debug log
      
      if (!Array.isArray(features)) {
        console.error('Parsed result is not an array:', features);
        throw new Error('OpenAI response is not an array');
      }

      // Validate feature structure
      features.forEach((feature, index) => {
        if (!feature.name || !feature.description || !feature.status) {
          console.error(`Invalid feature at index ${index}:`, feature);
          throw new Error(`Feature at index ${index} is missing required fields`);
        }
      });
    } catch (e) {
      console.error('Failed to parse OpenAI response:', e);
      console.error('Response content:', aiResponse.choices?.[0]?.message?.content);
      throw new Error(`Failed to parse feature list: ${e.message}`);
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
          author_id: userId,
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
      .update({ 
        status: 'completed',
        analysis_results: { features }
      })
      .eq('id', analysis.id);

    return new Response(JSON.stringify({ success: true, features }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing analysis:', error);
    
    // Update analysis status to error
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    await supabase
      .from('codeql_analyses')
      .update({ 
        status: 'error',
        error_message: error.message
      })
      .eq('product_id', (await req.json()).productId);
    
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
