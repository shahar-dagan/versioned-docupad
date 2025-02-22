
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const DEEPSOURCE_API_KEY = Deno.env.get('DEEPSOURCE_API_KEY');
const DEEPSOURCE_API_URL = 'https://api.deepsource.io/v1';

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
    const { repository } = await req.json();

    if (!repository) {
      throw new Error('Repository name is required');
    }

    if (!DEEPSOURCE_API_KEY) {
      throw new Error('DeepSource API key is not configured');
    }

    console.log('Analyzing repository:', repository);

    // Call DeepSource API for analysis
    const response = await fetch(`${DEEPSOURCE_API_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSOURCE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        repository: repository,
        analyzer: 'javascript',
        options: {
          include_features: true,
          include_metrics: true,
        },
      }),
    });

    if (!response.ok) {
      console.error('DeepSource API error:', response.statusText);
      throw new Error(`DeepSource API error: ${response.statusText}`);
    }

    const analysisResult = await response.json();
    console.log('Analysis result:', analysisResult);
    
    return new Response(JSON.stringify({ 
      success: true,
      data: analysisResult 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analyze-code function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
