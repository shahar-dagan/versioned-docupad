import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

interface CodeAnalysis {
  components: Map<string, ComponentMetadata>;
  routes: Map<string, RouteMetadata>;
  dataFlow: Map<string, DataFlowMetadata>;
  interactions: Map<string, InteractionMetadata>;
}

interface ComponentMetadata {
  name: string;
  imports: string[];
  stateUsage: string[];
  props: string[];
  eventHandlers: string[];
  content: string;
}

interface RouteMetadata {
  path: string;
  component: string;
  isProtected: boolean;
  params: string[];
}

interface DataFlowMetadata {
  queries: string[];
  mutations: string[];
  context: string[];
  state: string[];
}

interface InteractionMetadata {
  type: string;
  handler: string;
  component: string;
}

const analyzeCode = (content: string): CodeAnalysis => {
  const analysis: CodeAnalysis = {
    components: new Map(),
    routes: new Map(),
    dataFlow: new Map(),
    interactions: new Map()
  };

  try {
    const componentMatches = content.match(/(?:export\s+)?(?:const|function)\s+([A-Z]\w+)[^]*?(?=export|$)/g) || [];
    componentMatches.forEach(componentBlock => {
      const nameMatch = componentBlock.match(/(?:export\s+)?(?:const|function)\s+([A-Z]\w+)/);
      if (nameMatch) {
        const name = nameMatch[1];
        
        const imports = Array.from(componentBlock.matchAll(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g))
          .map(match => match[1]);

        const stateUsage = Array.from(componentBlock.matchAll(/use(?:State|Reducer|Context)\((.*?)\)/g))
          .map(match => match[0]);

        const props = Array.from(componentBlock.matchAll(/(?:interface|type)\s+\w+Props\s*=\s*{([^}]+)}/g))
          .flatMap(match => {
            const propsBlock = match[1];
            return Array.from(propsBlock.matchAll(/(\w+)\s*:/g)).map(m => m[1]);
          });

        const eventHandlers = Array.from(componentBlock.matchAll(/(?:const|function)\s+handle(\w+)/g))
          .map(match => match[1]);

        analysis.components.set(name, {
          name,
          imports,
          stateUsage,
          props,
          eventHandlers,
          content: componentBlock
        });
      }
    });

    const routeMatches = content.match(/<Route[^>]*>/g) || [];
    routeMatches.forEach(match => {
      const pathMatch = match.match(/path=["']([^"']+)["']/);
      const componentMatch = match.match(/component=["']([^"']+)["']/);
      
      if (pathMatch && componentMatch) {
        const path = pathMatch[1];
        analysis.routes.set(path, {
          path,
          component: componentMatch[1],
          isProtected: match.includes('PrivateRoute'),
          params: Array.from(path.matchAll(/:(\w+)/g)).map(m => m[1])
        });
      }
    });

    const dataMatches = content.match(/use(?:Query|Mutation|Context)\((.*?)\)/g) || [];
    dataMatches.forEach(match => {
      const name = match.match(/use(\w+)/)?.[1] || '';
      if (!analysis.dataFlow.has(name)) {
        analysis.dataFlow.set(name, {
          queries: [],
          mutations: [],
          context: [],
          state: []
        });
      }
    });

    const interactionMatches = content.match(/on[A-Z]\w+={([^}]+)}/g) || [];
    interactionMatches.forEach(match => {
      const typeMatch = match.match(/on([A-Z]\w+)/);
      const handlerMatch = match.match(/{([^}]+)}/);
      
      if (typeMatch && handlerMatch) {
        const type = typeMatch[1];
        const handler = handlerMatch[1];
        analysis.interactions.set(handler, {
          type: type.toLowerCase(),
          handler,
          component: 'Unknown'
        });
      }
    });

  } catch (error) {
    console.error('Error analyzing code:', error);
  }

  return analysis;
};

const analyzeComponentWithAI = async (content: string, filePath: string, openAIKey: string) => {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a UI/UX expert analyzing React components. For each component:
            1. Identify user-facing features and functionality
            2. Note component relationships and hierarchy
            3. Describe user interactions and state management
            4. Focus on the user's perspective`
          },
          {
            role: 'user',
            content: `Analyze this React component file at ${filePath} and describe its features:
            
            ${content}`
          }
        ],
      }),
    });

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error analyzing component with AI:', error);
    return null;
  }
};

const summarizeFeatures = async (componentAnalyses: Array<{path: string, analysis: string}>, openAIKey: string) => {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a technical analyst combining individual component analyses into a cohesive feature list.
            Group related functionality and create a hierarchical feature structure.`
          },
          {
            role: 'user',
            content: `Based on these component analyses, create a structured feature list:
            
            ${componentAnalyses.map(a => `File: ${a.path}\nAnalysis: ${a.analysis}\n---`).join('\n')}`
          }
        ],
      }),
    });

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error summarizing features:', error);
    return null;
  }
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { repoFullName, productId, userId } = await req.json();
    console.log('Starting repository analysis for:', { repoFullName, productId, userId });

    const githubToken = Deno.env.get('GITHUB_ACCESS_TOKEN');
    const openAIKey = Deno.env.get('OPENAI_API_KEY');

    if (!githubToken || !openAIKey) {
      throw new Error('Required API keys not found');
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

    // Create analysis record to track progress
    const { data: analysis, error: analysisError } = await supabase
      .from('codeql_analyses')
      .insert({
        product_id: productId,
        repository_name: repoFullName,
        status: 'in_progress',
        triggered_by: userId,
        progress: 0,
        analysis_results: { steps: [] }
      })
      .select()
      .single();

    if (analysisError) {
      throw new Error('Failed to create analysis record');
    }

    const updateProgress = async (progress: number, step: string) => {
      const { error } = await supabase
        .from('codeql_analyses')
        .update({ 
          progress,
          analysis_results: {
            ...analysis.analysis_results,
            steps: [...analysis.analysis_results.steps, { step, timestamp: new Date().toISOString() }]
          }
        })
        .eq('id', analysis.id);

      if (error) console.error('Error updating progress:', error);
    };

    // 1. Get repository content
    const contentResponse = await fetch(
      `https://api.github.com/repos/${repoFullName}/git/trees/main?recursive=1`,
      { headers }
    );

    if (!contentResponse.ok) {
      throw new Error('Failed to access repository content');
    }

    const contentData = await contentResponse.json();
    const files = contentData.tree.filter((item: any) => 
      item.type === 'blob' && 
      (item.path.endsWith('.tsx') || item.path.endsWith('.jsx'))
    );

    console.log(`Found ${files.length} component files to analyze`);
    await updateProgress(10, 'Found component files');

    // 2. Analyze each file individually
    const componentAnalyses = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const progress = 10 + Math.floor((i / files.length) * 40); // Progress from 10% to 50%
      await updateProgress(progress, `Analyzing ${file.path}`);

      const fileResponse = await fetch(
        `https://api.github.com/repos/${repoFullName}/contents/${file.path}`,
        { headers }
      );
      
      if (fileResponse.ok) {
        const fileData = await fileResponse.json();
        const content = atob(fileData.content);
        
        const analysis = await analyzeComponentWithAI(content, file.path, openAIKey);
        if (analysis) {
          componentAnalyses.push({
            path: file.path,
            analysis
          });
        }
      }
    }

    await updateProgress(50, 'Individual component analysis complete');

    // 3. Summarize all analyses into a feature list
    await updateProgress(60, 'Starting feature summarization');
    const featureSummary = await summarizeFeatures(componentAnalyses, openAIKey);
    await updateProgress(80, 'Feature summarization complete');

    // 4. Get CodeQL alerts
    const alertsResponse = await fetch(
      `https://api.github.com/repos/${repoFullName}/code-scanning/alerts`,
      { headers }
    );

    let alerts = [];
    if (alertsResponse.ok) {
      alerts = await alertsResponse.json();
      console.log(`Found ${alerts.length} CodeQL alerts`);
    }

    await updateProgress(90, 'Security analysis complete');

    // 5. Store final results
    const { error: updateError } = await supabase
      .from('codeql_analyses')
      .update({
        status: 'completed',
        progress: 100,
        analysis_results: {
          componentAnalyses,
          featureSummary,
          alerts,
          completedAt: new Date().toISOString()
        }
      })
      .eq('id', analysis.id);

    if (updateError) {
      throw updateError;
    }

    // 6. Create features based on the summary
    const features = featureSummary.split('\n')
      .filter(line => line.trim())
      .map(feature => ({
        name: feature.split(':')[0].trim(),
        description: feature.split(':')[1]?.trim() || feature,
        product_id: productId,
        author_id: userId,
        status: 'active',
        suggestions: [],
        technical_docs: {
          sourceAnalysis: componentAnalyses
            .filter(a => a.analysis.includes(feature.split(':')[0].trim()))
            .map(a => ({ file: a.path, context: a.analysis }))
        },
        last_analyzed_at: new Date().toISOString()
      }));

    for (const feature of features) {
      const { error: featureError } = await supabase
        .from('features')
        .insert([feature]);

      if (featureError) {
        console.error('Error creating feature:', featureError);
        console.error('Feature data:', feature);
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Repository analysis completed',
        analysisId: analysis.id,
        featuresFound: features.length,
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
