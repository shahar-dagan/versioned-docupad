
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { repoFullName, productId, userId } = await req.json();
    console.log('Analyzing repository:', { repoFullName, productId, userId });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get GitHub token
    const { data: tokenData, error: tokenError } = await supabase
      .from('secrets')
      .select('value')
      .eq('name', 'GITHUB_ACCESS_TOKEN')
      .single();

    if (tokenError || !tokenData) {
      console.error('Failed to get GitHub token:', tokenError);
      throw new Error('Failed to get GitHub token');
    }

    // Analyze files in the repository
    const analyzeFiles = async () => {
      const response = await fetch(`https://api.github.com/repos/${repoFullName}/contents`, {
        headers: {
          'Authorization': `Bearer ${tokenData.value}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch repository contents');
      }

      const contents = await response.json();
      const features = [];

      // Process only typescript/javascript files
      for (const item of contents) {
        if (item.type === 'file' && 
            (item.name.endsWith('.ts') || 
             item.name.endsWith('.tsx') || 
             item.name.endsWith('.js') || 
             item.name.endsWith('.jsx'))) {
          
          const fileResponse = await fetch(item.download_url);
          if (!fileResponse.ok) continue;

          const content = await fileResponse.text();
          
          // Simple feature detection based on common patterns
          const feature = {
            name: item.name.replace(/\.(tsx?|jsx?)$/, ''),
            description: `Component or module from ${item.path}`,
            interactions: [],
          };

          // Detect React components
          if (content.includes('export default') || content.includes('export function')) {
            feature.interactions.push('Component definition found');
          }

          // Detect event handlers
          if (content.includes('onClick=') || content.includes('onChange=')) {
            feature.interactions.push('User interaction handlers detected');
          }

          // Detect forms
          if (content.includes('<form') || content.includes('handleSubmit')) {
            feature.interactions.push('Form handling detected');
          }

          features.push({
            product_id: productId,
            name: feature.name,
            description: feature.description,
            author_id: userId,
            status: 'active',
            suggestions: feature.interactions,
            last_analyzed_at: new Date().toISOString(),
          });
        }
      }

      return features;
    };

    console.log('Starting repository analysis');
    const features = await analyzeFiles();
    console.log('Analysis complete, found features:', features.length);

    // Store the features
    if (features.length > 0) {
      const { error: insertError } = await supabase
        .from('features')
        .upsert(features);

      if (insertError) {
        console.error('Failed to store features:', insertError);
        throw insertError;
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Analysis completed successfully',
        featuresAnalyzed: features.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in analyze-repository function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
