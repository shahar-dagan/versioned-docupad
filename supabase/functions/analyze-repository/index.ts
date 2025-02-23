
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisStep {
  step: string;
  timestamp: string;
}

async function analyzeFileContent(content: string, filePath: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert at analyzing React components and identifying UI features. Analyze the code and identify:
          1. Main UI components and their hierarchy
          2. User interactions and their effects
          3. UI state management
          4. Visual elements and their styling
          5. Navigation features
          Provide a structured analysis that preserves the hierarchical relationship between components.`
        },
        {
          role: 'user',
          content: `File path: ${filePath}\n\nContent:\n${content}`
        }
      ],
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

async function updateAnalysisProgress(analysisId: string, progress: number, step: AnalysisStep) {
  await supabase
    .from('codeql_analyses')
    .update({
      progress,
      status: progress < 100 ? 'in_progress' : 'completed',
      steps: supabase.sql`array_append(steps, ${step}::jsonb)`,
    })
    .eq('id', analysisId);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { repoFullName, productId, userId } = await req.json();

    // Create initial analysis record
    const { data: analysis, error: createError } = await supabase
      .from('codeql_analyses')
      .insert({
        product_id: productId,
        status: 'in_progress',
        progress: 0,
        steps: [],
        analysis_results: { steps: [] }
      })
      .select()
      .single();

    if (createError) throw createError;

    // Start the background analysis
    EdgeRuntime.waitUntil((async () => {
      try {
        const repoFiles = await fetchRepositoryFiles(repoFullName);
        const totalFiles = repoFiles.length;
        let processedFiles = 0;
        let allAnalyses = [];

        for (const file of repoFiles) {
          if (file.name.endsWith('.tsx') || file.name.endsWith('.jsx')) {
            const fileContent = await fetchFileContent(file.url);
            const analysis = await analyzeFileContent(fileContent, file.name);
            allAnalyses.push({ file: file.name, analysis });
            
            processedFiles++;
            const progress = Math.round((processedFiles / totalFiles) * 100);
            
            await updateAnalysisProgress(analysis.id, progress, {
              step: `Analyzed ${file.name}`,
              timestamp: new Date().toISOString()
            });
          }
        }

        // Generate final summary
        const summaryResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              {
                role: 'system',
                content: 'Create a comprehensive summary of UI features from the individual file analyses. Organize features hierarchically and eliminate redundancies.'
              },
              {
                role: 'user',
                content: JSON.stringify(allAnalyses)
              }
            ],
          }),
        });

        const summaryData = await summaryResponse.json();
        const finalSummary = summaryData.choices[0].message.content;

        // Update analysis with final results
        await supabase
          .from('codeql_analyses')
          .update({
            status: 'completed',
            progress: 100,
            analysis_results: {
              summary: finalSummary,
              fileAnalyses: allAnalyses
            }
          })
          .eq('id', analysis.id);

      } catch (error) {
        console.error('Background analysis error:', error);
        await supabase
          .from('codeql_analyses')
          .update({
            status: 'failed',
            progress: 0
          })
          .eq('id', analysis.id);
      }
    })());

    return new Response(JSON.stringify({ id: analysis.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function fetchRepositoryFiles(repoFullName: string) {
  const response = await fetch(`https://api.github.com/repos/${repoFullName}/git/trees/main?recursive=1`, {
    headers: { 'Authorization': `Bearer ${Deno.env.get('GITHUB_ACCESS_TOKEN')}` }
  });
  const data = await response.json();
  return data.tree.filter((file: any) => 
    file.type === 'blob' && 
    (file.path.endsWith('.tsx') || file.path.endsWith('.jsx'))
  );
}

async function fetchFileContent(url: string) {
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${Deno.env.get('GITHUB_ACCESS_TOKEN')}` }
  });
  return await response.text();
}
