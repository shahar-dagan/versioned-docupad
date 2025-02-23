
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

async function generateDocumentation(features: any[]) {
  const documentation = features.map(feature => {
    // Basic documentation structure
    return {
      overview: `${feature.name} - ${feature.description}`,
      steps: [
        "Access the feature through the main interface",
        "Follow the on-screen instructions",
        "Save your changes when finished"
      ],
      use_cases: [
        "Basic usage scenario",
        "Advanced configuration",
        "Integration with other features"
      ],
      faq: [
        {
          question: "How do I get started?",
          answer: "Access the feature through the main interface and follow the guided setup."
        },
        {
          question: "Can I customize this feature?",
          answer: "Yes, various customization options are available in the settings."
        }
      ]
    };
  });

  return documentation;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productId } = await req.json();
    
    console.log('Generating documentation for product:', productId);

    // Get all features for the product
    const { data: features, error: fetchError } = await supabase
      .from('features')
      .select('*')
      .eq('product_id', productId);

    if (fetchError) {
      console.error('Error fetching features:', fetchError);
      throw new Error('Failed to fetch features');
    }

    if (!features || features.length === 0) {
      throw new Error('No features found for this product');
    }

    console.log(`Found ${features.length} features to document`);

    // Generate documentation for each feature
    for (const feature of features) {
      const docs = await generateDocumentation([feature]);
      const { error: updateError } = await supabase
        .from('features')
        .update({
          user_docs: docs[0],
          last_analyzed_at: new Date().toISOString()
        })
        .eq('id', feature.id);

      if (updateError) {
        console.error(`Error updating documentation for feature ${feature.id}:`, updateError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        featuresProcessed: features.length,
        message: `Successfully generated documentation for ${features.length} features`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in process-documentation function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
