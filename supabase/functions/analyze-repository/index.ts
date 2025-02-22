
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CodeQLAlert {
  rule: { id: string; description: string };
  most_recent_instance: {
    location: {
      path: string;
      start_line: number;
      end_line: number;
    };
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { repoFullName, productId, userId } = await req.json();
    console.log('Analyzing repository:', { repoFullName, productId, userId });

    const githubToken = Deno.env.get('GITHUB_ACCESS_TOKEN');
    if (!githubToken) {
      throw new Error('GitHub token not found in environment variables');
    }

    const headers = {
      'Authorization': `token ${githubToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Supabase-Edge-Function'
    };

    // First, check if CodeQL is enabled
    console.log('Checking CodeQL status for repository:', repoFullName);
    const codeQLStatusResponse = await fetch(
      `https://api.github.com/repos/${repoFullName}/code-scanning/analyses`,
      { headers }
    );

    let hasCodeQL = true;
    if (!codeQLStatusResponse.ok) {
      console.warn('CodeQL might not be enabled:', await codeQLStatusResponse.text());
      hasCodeQL = false;
    }

    // Fetch CodeQL alerts if available
    let codeQLAlerts: CodeQLAlert[] = [];
    if (hasCodeQL) {
      console.log('Fetching CodeQL alerts');
      const alertsResponse = await fetch(
        `https://api.github.com/repos/${repoFullName}/code-scanning/alerts`,
        { headers }
      );

      if (alertsResponse.ok) {
        codeQLAlerts = await alertsResponse.json();
        console.log(`Found ${codeQLAlerts.length} CodeQL alerts`);
      } else {
        console.warn('Failed to fetch CodeQL alerts:', await alertsResponse.text());
      }
    }

    // Fetch repository contents
    const response = await fetch(`https://api.github.com/repos/${repoFullName}/contents`, {
      headers
    });

    if (!response.ok) {
      throw new Error(`Repository access failed: ${response.statusText}`);
    }

    const contents = await response.json();
    console.log(`Found ${contents.length} files/directories in repository`);
    
    const features = [];
    const processedPaths = new Set();

    // First, process CodeQL alerts to identify important files
    for (const alert of codeQLAlerts) {
      const path = alert.most_recent_instance.location.path;
      if (!processedPaths.has(path) && 
          (path.endsWith('.ts') || path.endsWith('.tsx') || 
           path.endsWith('.js') || path.endsWith('.jsx'))) {
        
        processedPaths.add(path);
        console.log(`Processing file from CodeQL alert: ${path}`);
        
        try {
          const fileResponse = await fetch(
            `https://api.github.com/repos/${repoFullName}/contents/${path}`,
            { headers }
          );
          
          if (!fileResponse.ok) continue;
          
          const fileData = await fileResponse.json();
          const content = atob(fileData.content);
          
          features.push({
            product_id: productId,
            name: path.split('/').pop()?.replace(/\.(tsx?|jsx?)$/, '') || 'Unknown',
            description: `Found via CodeQL analysis - ${alert.rule.description}`,
            author_id: userId,
            status: 'active',
            suggestions: [`Security consideration: ${alert.rule.description}`],
            last_analyzed_at: new Date().toISOString(),
          });
        } catch (error) {
          console.warn(`Failed to process file ${path}:`, error);
        }
      }
    }

    // Then process regular files
    for (const item of contents) {
      if (item.type === 'file' && 
          !processedPaths.has(item.path) &&
          (item.name.endsWith('.ts') || 
           item.name.endsWith('.tsx') || 
           item.name.endsWith('.js') || 
           item.name.endsWith('.jsx'))) {
        
        processedPaths.add(item.path);
        console.log(`Analyzing file: ${item.path}`);
        
        try {
          const fileResponse = await fetch(item.download_url, { headers });
          if (!fileResponse.ok) continue;
          
          const content = await fileResponse.text();
          const suggestions = [];

          if (content.includes('export default') || content.includes('export function')) {
            suggestions.push('Component definition found');
          }
          if (content.includes('onClick=') || content.includes('onChange=')) {
            suggestions.push('User interaction handlers detected');
          }
          if (content.includes('<form') || content.includes('handleSubmit')) {
            suggestions.push('Form handling detected');
          }
          if (content.includes('fetch(') || content.includes('axios.')) {
            suggestions.push('API integration detected');
          }
          if (content.includes('useState') || content.includes('useReducer')) {
            suggestions.push('State management implementation');
          }

          features.push({
            product_id: productId,
            name: item.name.replace(/\.(tsx?|jsx?)$/, ''),
            description: `Component or module from ${item.path}`,
            author_id: userId,
            status: 'active',
            suggestions,
            last_analyzed_at: new Date().toISOString(),
          });
        } catch (error) {
          console.warn(`Failed to analyze file ${item.path}:`, error);
        }
      }
    }

    console.log(`Analysis complete, found ${features.length} features`);

    // Store features in Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (features.length > 0) {
      const { error: insertError } = await supabase
        .from('features')
        .upsert(features);

      if (insertError) {
        throw insertError;
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Analysis completed successfully',
        featuresAnalyzed: features.length,
        codeQLEnabled: hasCodeQL,
        codeQLAlerts: codeQLAlerts.length
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
