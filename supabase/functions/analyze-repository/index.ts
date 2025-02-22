
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting repository analysis...');
    const { repoFullName, productId, userId } = await req.json();
    console.log('Received parameters:', { repoFullName, productId, userId });

    if (!repoFullName || !productId || !userId) {
      throw new Error('Missing required parameters');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client created successfully');

    // For testing, let's create a sample feature
    const featureData = {
      name: 'Test Feature',
      description: 'This is a test feature created by the analyze-repository function',
      product_id: productId,
      author_id: userId,
      status: 'active',
      suggestions: ['Suggestion 1', 'Suggestion 2'],
      created_at: new Date().toISOString(),
    };

    console.log('Attempting to insert feature:', featureData);

    const { data, error } = await supabase
      .from('features')
      .insert([featureData])
      .select();

    if (error) {
      console.error('Error inserting feature:', error);
      throw error;
    }

    console.log('Feature inserted successfully:', data);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Repository analyzed successfully',
      data 
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
