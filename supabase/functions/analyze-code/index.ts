
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const DEEPSOURCE_API_KEY = Deno.env.get('DEEPSOURCE_API_KEY');
const DEEPSOURCE_API_URL = 'https://api.deepsource.io/v1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { codeContent } = await req.json();

    // Call DeepSource API for analysis
    const response = await fetch(`${DEEPSOURCE_API_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSOURCE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: codeContent,
        analyzer: 'javascript',
        options: {
          include_features: true,
          include_metrics: true,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSource API error: ${response.statusText}`);
    }

    const analysisResult = await response.json();
    
    // Process and structure the analysis results
    const features = processAnalysisResults(analysisResult);

    return new Response(JSON.stringify({ features }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analyze-code function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function processAnalysisResults(results: any) {
  // Transform DeepSource analysis results into our feature format
  const features = {
    components: [],
    functionality: [],
    dataOperations: [],
    security: [],
  };

  if (results.analysis) {
    // Process components and UI elements
    if (results.analysis.components) {
      features.components = results.analysis.components.map((component: any) => ({
        name: component.name,
        type: component.type,
        complexity: component.complexity,
      }));
    }

    // Process functionality and features
    if (results.analysis.features) {
      features.functionality = results.analysis.features.map((feature: any) => ({
        name: feature.name,
        description: feature.description,
        category: feature.category,
      }));
    }

    // Process data operations
    if (results.analysis.dataOperations) {
      features.dataOperations = results.analysis.dataOperations.map((op: any) => ({
        type: op.type,
        target: op.target,
        complexity: op.complexity,
      }));
    }

    // Process security considerations
    if (results.analysis.security) {
      features.security = results.analysis.security.map((item: any) => ({
        type: item.type,
        severity: item.severity,
        description: item.description,
      }));
    }
  }

  return features;
}
