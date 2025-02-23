
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function extractFeatures(content: string, filePath: string) {
  // Simple feature extraction based on common patterns
  const features = [];
  
  // Look for React components
  const componentMatch = content.match(/function\s+(\w+)\s*\(/g);
  if (componentMatch) {
    features.push({
      name: `${filePath} Component`,
      description: `React component found in ${filePath}`,
      type: 'component'
    });
  }

  // Look for hooks
  const hooksMatch = content.match(/use\w+/g);
  if (hooksMatch) {
    features.push({
      name: `${filePath} Hooks`,
      description: `Custom hooks found: ${hooksMatch.join(', ')}`,
      type: 'hook'
    });
  }

  // Look for API endpoints
  if (filePath.includes('api/') || filePath.includes('functions/')) {
    features.push({
      name: `${filePath} API`,
      description: `API endpoint in ${filePath}`,
      type: 'api'
    });
  }

  return features;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { repoFullName, productId, userId } = await req.json();

    // Fetch repository content (simplified)
    const response = await fetch(`https://api.github.com/repos/${repoFullName}/contents`);
    const files = await response.json();

    const allFeatures = [];
    
    // Process only key directories and files
    for (const file of files) {
      if (file.type === 'file' && 
          (file.path.endsWith('.tsx') || 
           file.path.endsWith('.ts') || 
           file.path.endsWith('.jsx') || 
           file.path.endsWith('.js'))) {
        
        const contentResponse = await fetch(file.download_url);
        const content = await contentResponse.text();
        
        const features = await extractFeatures(content, file.path);
        allFeatures.push(...features);
      }
    }

    // Store features in the database
    for (const feature of allFeatures) {
      await supabase.from('features').insert({
        product_id: productId,
        name: feature.name,
        description: feature.description,
        status: 'active',
        created_at: new Date().toISOString(),
        author_id: userId
      });
    }

    return new Response(JSON.stringify({ success: true, featuresCount: allFeatures.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in analyze-repository function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
