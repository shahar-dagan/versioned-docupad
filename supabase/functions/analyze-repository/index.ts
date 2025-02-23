
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
    // Find component definitions
    const componentMatches = content.match(/(?:export\s+)?(?:const|function)\s+([A-Z]\w+)[^]*?(?=export|$)/g) || [];
    componentMatches.forEach(componentBlock => {
      const nameMatch = componentBlock.match(/(?:export\s+)?(?:const|function)\s+([A-Z]\w+)/);
      if (nameMatch) {
        const name = nameMatch[1];
        
        // Extract imports
        const imports = Array.from(componentBlock.matchAll(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g))
          .map(match => match[1]);

        // Extract state usage
        const stateUsage = Array.from(componentBlock.matchAll(/use(?:State|Reducer|Context)\((.*?)\)/g))
          .map(match => match[0]);

        // Extract props
        const props = Array.from(componentBlock.matchAll(/(?:interface|type)\s+\w+Props\s*=\s*{([^}]+)}/g))
          .flatMap(match => {
            const propsBlock = match[1];
            return Array.from(propsBlock.matchAll(/(\w+)\s*:/g)).map(m => m[1]);
          });

        // Extract event handlers
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

    // Find routes
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

    // Find data operations
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

    // Find user interactions
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

const generateFeatureDescription = async (component: ComponentMetadata, openAIKey: string): Promise<string> => {
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
          content: 'You are a technical writer that generates concise feature descriptions based on React component analysis. Focus on functionality and user value.'
        },
        {
          role: 'user',
          content: `Generate a concise feature description based on this React component analysis:
          Component: ${component.name}
          State Usage: ${component.stateUsage.join(', ')}
          Props: ${component.props.join(', ')}
          Event Handlers: ${component.eventHandlers.join(', ')}
          Imports: ${component.imports.join(', ')}
          
          Code Context:
          ${component.content}`
        }
      ],
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content.trim();
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

    // 2. Analyze each file
    const features = new Map();
    for (const file of files) {
      const fileResponse = await fetch(
        `https://api.github.com/repos/${repoFullName}/contents/${file.path}`,
        { headers }
      );
      
      if (fileResponse.ok) {
        const fileData = await fileResponse.json();
        const content = atob(fileData.content);
        
        // Perform structured analysis
        const analysis = analyzeCode(content);
        
        // Process each component as a potential feature
        for (const [name, component] of analysis.components.entries()) {
          if (!features.has(name)) {
            // Generate enhanced description using OpenAI
            const description = await generateFeatureDescription(component, openAIKey);
            
            features.set(name, {
              name,
              description,
              technical_details: {
                stateUsage: component.stateUsage,
                props: component.props,
                eventHandlers: component.eventHandlers,
                imports: component.imports,
                routes: Array.from(analysis.routes.entries())
                  .filter(([_, route]) => route.component === name)
                  .map(([path]) => path),
                dataOperations: Array.from(analysis.dataFlow.entries())
                  .filter(([_, flow]) => 
                    component.content.includes(flow.queries[0]) || 
                    component.content.includes(flow.mutations[0])
                  )
                  .map(([name]) => name),
              },
              suggestions: [],
              file_path: file.path,
            });
          }
        }
      }
    }

    // 3. Get CodeQL alerts
    const alertsResponse = await fetch(
      `https://api.github.com/repos/${repoFullName}/code-scanning/alerts`,
      { headers }
    );

    if (alertsResponse.ok) {
      const alerts = await alertsResponse.json();
      console.log(`Found ${alerts.length} CodeQL alerts`);

      // Map alerts to features
      alerts.forEach(alert => {
        const filePath = alert.most_recent_instance?.location?.path;
        if (filePath) {
          for (const [name, feature] of features.entries()) {
            if (feature.file_path === filePath) {
              feature.suggestions.push({
                type: 'security',
                description: alert.rule.description,
                severity: alert.rule.security_severity_level
              });
            }
          }
        }
      });
    }

    // 4. Store features
    let createdFeatures = 0;
    for (const feature of features.values()) {
      const { error: featureError } = await supabase
        .from('features')
        .insert([{
          name: feature.name,
          description: feature.description,
          product_id: productId,
          author_id: userId,
          status: 'active',
          suggestions: feature.suggestions,
          technical_docs: feature.technical_details,
          last_analyzed_at: new Date().toISOString()
        }]);

      if (featureError) {
        console.error('Error creating feature:', featureError);
      } else {
        createdFeatures++;
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Repository analysis completed',
        featuresFound: features.size,
        featuresCreated: createdFeatures,
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
