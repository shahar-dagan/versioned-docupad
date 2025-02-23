
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

interface ComponentMetadata {
  name: string;
  imports: Set<string>;
  stateUsage: Set<string>;
  props: Set<string>;
  eventHandlers: Set<string>;
}

interface RouteMetadata {
  path: string;
  component: string;
  isProtected: boolean;
  params: Set<string>;
}

// Simple pattern-based code analysis
const analyzeCode = (content: string) => {
  const analysis = {
    components: new Map<string, ComponentMetadata>(),
    routes: new Map<string, RouteMetadata>(),
    hooks: new Set<string>(),
    apis: new Set<string>(),
  };

  // Find React components
  const componentMatches = content.match(/(?:export\s+)?(?:const|function)\s+([A-Z]\w+)/g) || [];
  componentMatches.forEach(match => {
    const name = match.split(/\s+/).pop() || '';
    analysis.components.set(name, {
      name,
      imports: new Set(),
      stateUsage: new Set(),
      props: new Set(),
      eventHandlers: new Set()
    });
  });

  // Find routes
  const routeMatches = content.match(/<Route[^>]*>/g) || [];
  routeMatches.forEach(match => {
    const path = match.match(/path=["']([^"']+)["']/) || [];
    const component = match.match(/component=["']([^"']+)["']/) || [];
    if (path[1] && component[1]) {
      analysis.routes.set(path[1], {
        path: path[1],
        component: component[1],
        isProtected: match.includes('PrivateRoute'),
        params: new Set()
      });
    }
  });

  // Find hooks usage
  const hookMatches = content.match(/use[A-Z]\w+/g) || [];
  hookMatches.forEach(hook => analysis.hooks.add(hook));

  // Find API endpoints
  const apiMatches = content.match(/(?:fetch|axios\.(?:get|post|put|delete))\(['"]([^'"]+)['"]/g) || [];
  apiMatches.forEach(api => analysis.apis.add(api));

  return analysis;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { repoFullName, productId, userId } = await req.json();
    console.log('Starting repository analysis for:', { repoFullName, productId, userId });

    const githubToken = Deno.env.get('GITHUB_ACCESS_TOKEN');
    const openAIKey = Deno.env.get('OPENAI_API_KEY');

    if (!githubToken) {
      throw new Error('GitHub token not found');
    }

    const headers = {
      'Authorization': `token ${githubToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Supabase-Edge-Function'
    };

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Get repository content
    const contentResponse = await fetch(
      `https://api.github.com/repos/${repoFullName}/git/trees/main?recursive=1`,
      { headers }
    );

    if (!contentResponse.ok) {
      console.error('Failed to fetch repo content:', await contentResponse.text());
      throw new Error('Failed to access repository content');
    }

    const contentData = await contentResponse.json();
    const files = contentData.tree.filter((item: any) => 
      item.type === 'blob' && 
      (item.path.endsWith('.ts') || item.path.endsWith('.tsx') || item.path.endsWith('.js') || item.path.endsWith('.jsx'))
    );

    console.log(`Found ${files.length} code files to analyze`);

    // 2. Fetch and analyze files
    const features = new Map();
    for (const file of files) {
      const fileResponse = await fetch(
        `https://api.github.com/repos/${repoFullName}/contents/${file.path}`,
        { headers }
      );
      
      if (fileResponse.ok) {
        const fileData = await fileResponse.json();
        const content = atob(fileData.content);
        
        // Analyze the actual code structure
        const analysis = analyzeCode(content);
        
        // Extract features based on code patterns
        analysis.components.forEach((component, name) => {
          if (!features.has(name)) {
            features.set(name, {
              name,
              description: `Component that implements ${name} functionality`,
              suggestions: [],
              type: 'component',
              details: component
            });
          }
        });

        analysis.routes.forEach((route, path) => {
          const name = route.component.replace(/Page$|View$|Screen$/, '');
          if (!features.has(name)) {
            features.set(name, {
              name,
              description: `Route handling ${path} functionality`,
              suggestions: [],
              type: 'route',
              details: route
            });
          }
        });

        analysis.hooks.forEach(hook => {
          const name = hook.replace(/^use/, '');
          if (!features.has(name)) {
            features.set(name, {
              name,
              description: `Custom hook implementing ${name} functionality`,
              suggestions: [],
              type: 'hook'
            });
          }
        });
      }
    }

    console.log(`Identified ${features.size} distinct features from code analysis`);

    // 3. Get CodeQL alerts
    const alertsResponse = await fetch(
      `https://api.github.com/repos/${repoFullName}/code-scanning/alerts`,
      { headers }
    );

    let alerts = [];
    if (alertsResponse.ok) {
      alerts = await alertsResponse.json();
      console.log(`Found ${alerts.length} CodeQL alerts`);

      // Add security improvement suggestions based on CodeQL findings
      alerts.forEach(alert => {
        const affectedComponent = alert.most_recent_instance?.location?.path.split('/').pop()?.replace(/\.\w+$/, '');
        if (affectedComponent && features.has(affectedComponent)) {
          const feature = features.get(affectedComponent);
          feature.suggestions.push(`Fix security issue: ${alert.rule.description}`);
        }
      });
    }

    // 4. Store features in database
    let createdFeatures = 0;
    for (const feature of features.values()) {
      const { error: featureError } = await supabase
        .from('features')
        .insert([
          {
            name: feature.name,
            description: feature.description,
            product_id: productId,
            author_id: userId,
            status: 'active',
            suggestions: feature.suggestions,
            last_analyzed_at: new Date().toISOString(),
            metadata: {
              type: feature.type,
              details: feature.details
            }
          }
        ]);

      if (featureError) {
        console.error('Error creating feature:', featureError);
      } else {
        createdFeatures++;
      }
    }

    console.log(`Successfully created ${createdFeatures} features`);

    // Store analysis results
    const { error: analysisError } = await supabase
      .from('codeql_analyses')
      .insert({
        product_id: productId,
        repository_name: repoFullName,
        status: 'completed',
        triggered_by: userId,
        analysis_results: {
          alerts,
          features: Array.from(features.values()),
          analyzed_files: files.map(f => f.path),
          timestamp: new Date().toISOString()
        }
      });

    if (analysisError) {
      console.error('Error storing analysis:', analysisError);
    }

    return new Response(
      JSON.stringify({
        message: 'Repository analysis completed',
        featuresFound: features.size,
        featuresCreated: createdFeatures,
        alertsFound: alerts.length,
        status: 'completed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in analyze-repository function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
