
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const githubToken = Deno.env.get('GITHUB_ACCESS_TOKEN');

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
    
    console.log('Analyzing repository:', repoFullName);

    if (!githubToken) {
      throw new Error('GitHub token not configured');
    }

    // Fetch repository content
    const response = await fetch(`https://api.github.com/repos/${repoFullName}/contents`, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('GitHub API error:', errorData);
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const files = await response.json();
    
    if (!Array.isArray(files)) {
      console.error('Invalid response from GitHub API:', files);
      throw new Error('Invalid response from GitHub API');
    }

    console.log(`Found ${files.length} files to analyze`);
    
    const allFeatures = [];
    
    // Process only key directories and files
    for (const file of files) {
      if (file.type === 'file' && 
          (file.path.endsWith('.tsx') || 
           file.path.endsWith('.ts') || 
           file.path.endsWith('.jsx') || 
           file.path.endsWith('.js'))) {
        
        console.log('Analyzing file:', file.path);
        
        try {
          const contentResponse = await fetch(file.download_url, {
            headers: {
              'Authorization': `Bearer ${githubToken}`,
            }
          });

          if (!contentResponse.ok) {
            console.error(`Error fetching ${file.path}:`, contentResponse.statusText);
            continue;
          }

          const content = await contentResponse.text();
          const features = await extractFeatures(content, file.path);
          allFeatures.push(...features);
          
          console.log(`Found ${features.length} features in ${file.path}`);
        } catch (error) {
          console.error(`Error processing ${file.path}:`, error);
          continue;
        }
      }
    }

    console.log(`Total features found: ${allFeatures.length}`);

    // Store features in the database
    for (const feature of allFeatures) {
      const { error: insertError } = await supabase.from('features').insert({
        product_id: productId,
        name: feature.name,
        description: feature.description,
        status: 'active',
        created_at: new Date().toISOString(),
        author_id: userId
      });

      if (insertError) {
        console.error('Error inserting feature:', insertError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        featuresCount: allFeatures.length,
        message: `Successfully analyzed repository and found ${allFeatures.length} features`
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in analyze-repository function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
