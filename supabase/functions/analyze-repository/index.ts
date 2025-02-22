
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

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
    console.log('Analyzing repository:', repoFullName);

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

    // Get repository details
    const { data: repoData, error: repoError } = await supabase
      .from('github_repositories')
      .select('enterprise_url, enterprise_enabled')
      .eq('repository_name', repoFullName)
      .single();

    if (repoError) {
      console.error('Failed to get repository details:', repoError);
      throw new Error('Failed to get repository details');
    }

    const baseUrl = repoData.enterprise_enabled && repoData.enterprise_url 
      ? `${repoData.enterprise_url}/api/v3`
      : 'https://api.github.com';

    // Fetch repository content recursively
    const fetchContent = async (path = '') => {
      const response = await fetch(
        `${baseUrl}/repos/${repoFullName}/contents/${path}`,
        {
          headers: {
            'Authorization': `Bearer ${tokenData.value}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );

      if (!response.ok) {
        console.error('Failed to fetch content:', await response.text());
        throw new Error(`Failed to fetch content for path: ${path}`);
      }

      const contents = await response.json();
      return contents;
    };

    // Analyze content and gather feature information
    const analyzeContent = async (contents: any[]): Promise<any[]> => {
      const features = [];

      for (const item of contents) {
        if (item.type === 'file' && item.name.endsWith('.tsx')) {
          const response = await fetch(item.download_url, {
            headers: {
              'Authorization': `Bearer ${tokenData.value}`,
            },
          });

          if (!response.ok) continue;

          const content = await response.text();
          const feature = {
            path: item.path,
            name: item.name.replace('.tsx', ''),
            content: content,
            type: 'component',
            interactions: [],
          };

          // Extract user interactions
          const eventHandlerMatches = content.match(/on[A-Z]\w+={[^}]+}/g) || [];
          const formMatches = content.match(/<form[^>]*>[\s\S]*?<\/form>/g) || [];
          const buttonMatches = content.match(/<button[^>]*>[\s\S]*?<\/button>/g) || [];

          feature.interactions = [
            ...eventHandlerMatches.map(match => ({ type: 'event', content: match })),
            ...formMatches.map(match => ({ type: 'form', content: match })),
            ...buttonMatches.map(match => ({ type: 'button', content: match })),
          ];

          features.push(feature);
        }
      }

      return features;
    };

    // Start analysis
    console.log('Starting repository analysis');
    const contents = await fetchContent();
    const features = await analyzeContent(Array.isArray(contents) ? contents : [contents]);

    // Store analysis results
    const { error: insertError } = await supabase
      .from('features')
      .upsert(
        features.map(feature => ({
          product_id: productId,
          name: feature.name,
          description: `Component: ${feature.path}`,
          author_id: userId,
          status: 'active',
          suggestions: feature.interactions.map(i => 
            `User interaction found: ${i.type} in ${feature.path}`
          ),
          last_analyzed_at: new Date().toISOString(),
        }))
      );

    if (insertError) {
      console.error('Failed to store features:', insertError);
      throw new Error('Failed to store features');
    }

    return new Response(
      JSON.stringify({
        message: 'Analysis completed successfully',
        featuresAnalyzed: features.length,
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
