
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const DEEPSOURCE_API_KEY = Deno.env.get('DEEPSOURCE_API_KEY');
const DEEPSOURCE_API_URL = 'https://deepsource.io/api/v1';

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

    // The repository name should be in the format "owner/repo"
    console.log('Repository name received:', repository);

    // Check if the repository name is in the correct format
    if (!repository.includes('/')) {
      throw new Error('Repository name must be in the format "owner/repo"');
    }

    console.log('Analyzing repository:', repository);

    // First, we need to get the repository ID from DeepSource
    const repoResponse = await fetch(`${DEEPSOURCE_API_URL}/repos/gh/${repository}`, {
      headers: {
        'Authorization': `Bearer ${DEEPSOURCE_API_KEY}`,
        'Accept': 'application/json',
      },
    });

    if (!repoResponse.ok) {
      const errorText = await repoResponse.text();
      console.error('DeepSource repo fetch error:', errorText);
      throw new Error('Repository not found in DeepSource. Make sure the repository is activated in your DeepSource dashboard.');
    }

    const repoData = await repoResponse.json();
    const repoId = repoData.repository.id;

    // Trigger a new analysis
    const analysisResponse = await fetch(`${DEEPSOURCE_API_URL}/repos/${repoId}/analyze`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSOURCE_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      console.error('DeepSource analysis error:', errorText);
      throw new Error('Failed to trigger DeepSource analysis. Please check if the repository is properly configured.');
    }

    const analysisResult = await analysisResponse.json();
    console.log('Analysis triggered:', analysisResult);
    
    return new Response(JSON.stringify({ 
      success: true,
      data: analysisResult,
      message: 'Analysis triggered successfully. Results will be available in DeepSource dashboard.'
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
