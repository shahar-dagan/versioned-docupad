
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

async function analyzeFileContent(content: string, filePath: string) {
  console.log('Analyzing file:', filePath);
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an expert at analyzing React components and identifying UI features. Analyze the code and identify:
          1. Main UI components and their hierarchy
          2. User interactions and their effects
          3. UI state management
          4. Visual elements and their styling
          5. Navigation features
          Provide a structured analysis focusing on feature identification. Format your response as JSON with the following structure:
          {
            "features": [
              {
                "name": "string",
                "description": "string",
                "confidence": number between 0 and 1,
                "location": "string (file path)",
                "type": "component|hook|utility|context|etc",
                "dependencies": ["array of imports"]
              }
            ]
          }`
        },
        {
          role: 'user',
          content: `File path: ${filePath}\n\nContent:\n${content}`
        }
      ],
    }),
  });

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

async function updateAnalysisProgress(analysisId: string, progress: number, step: { step: string; timestamp: string }) {
  console.log('Updating analysis progress:', { analysisId, progress, step });
  await supabase
    .from('codeql_analyses')
    .update({
      progress,
      status: progress < 100 ? 'in_progress' : 'completed',
      steps: supabase.sql`array_append(steps, ${step}::jsonb)`,
    })
    .eq('id', analysisId);
}

async function storeFileAnalysis(
  productId: string,
  repositoryName: string,
  filePath: string,
  contentHash: string,
  hierarchyLevel: number,
  parentDirectory: string,
  featureSummaries: any
) {
  console.log('Storing file analysis:', { filePath, contentHash });
  await supabase
    .from('file_analyses')
    .upsert({
      product_id: productId,
      repository_name: repositoryName,
      file_path: filePath,
      file_content_hash: contentHash,
      hierarchy_level: hierarchyLevel,
      parent_directory: parentDirectory,
      feature_summaries: featureSummaries,
      last_analyzed_at: new Date().toISOString(),
    }, {
      onConflict: 'product_id,repository_name,file_path'
    });
}

async function consolidateFeatures(productId: string, analysisId: string, fileAnalyses: any[]) {
  console.log('Consolidating features for analysis:', analysisId);
  const features = new Map();

  // Aggregate features from all files
  fileAnalyses.forEach(analysis => {
    if (analysis.feature_summaries?.features) {
      analysis.feature_summaries.features.forEach((feature: any) => {
        const key = feature.name.toLowerCase();
        if (!features.has(key)) {
          features.set(key, {
            name: feature.name,
            confidence: feature.confidence,
            related_files: [feature.location],
            summary: feature.description,
            implementation_details: {
              type: feature.type,
              dependencies: feature.dependencies
            }
          });
        } else {
          const existing = features.get(key);
          existing.related_files.push(feature.location);
          existing.confidence = Math.max(existing.confidence, feature.confidence);
        }
      });
    }
  });

  // Store consolidated features
  for (const [, feature] of features) {
    await supabase
      .from('feature_analysis_results')
      .upsert({
        product_id: productId,
        analysis_id: analysisId,
        feature_name: feature.name,
        confidence_score: feature.confidence,
        related_files: feature.related_files,
        feature_summary: feature.summary,
        implementation_details: feature.implementation_details,
      }, {
        onConflict: 'product_id,analysis_id,feature_name'
      });
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { repoFullName, productId, userId, analysisId } = await req.json();

    EdgeRuntime.waitUntil((async () => {
      try {
        console.log('Starting analysis for repository:', repoFullName);
        const response = await fetch(`https://api.github.com/repos/${repoFullName}/git/trees/main?recursive=1`, {
          headers: { 'Authorization': `Bearer ${Deno.env.get('GITHUB_ACCESS_TOKEN')}` }
        });
        
        const data = await response.json();
        const files = data.tree.filter((file: any) => 
          file.type === 'blob' && 
          (file.path.endsWith('.tsx') || file.path.endsWith('.jsx'))
        );

        const totalFiles = files.length;
        let processedFiles = 0;
        const fileAnalyses = [];

        for (const file of files) {
          try {
            const fileContent = await fetch(file.url, {
              headers: { 'Authorization': `Bearer ${Deno.env.get('GITHUB_ACCESS_TOKEN')}` }
            }).then(res => res.text());

            const analysis = await analyzeFileContent(fileContent, file.path);
            const hierarchyLevel = file.path.split('/').length - 1;
            const parentDirectory = file.path.split('/').slice(0, -1).join('/');

            await storeFileAnalysis(
              productId,
              repoFullName,
              file.path,
              file.sha,
              hierarchyLevel,
              parentDirectory,
              analysis
            );

            fileAnalyses.push({
              file_path: file.path,
              feature_summaries: analysis
            });

            processedFiles++;
            const progress = Math.round((processedFiles / totalFiles) * 100);
            
            await updateAnalysisProgress(analysisId, progress, {
              step: `Analyzed ${file.path}`,
              timestamp: new Date().toISOString()
            });

          } catch (error) {
            console.error(`Error analyzing file ${file.path}:`, error);
          }
        }

        // Consolidate and store features
        await consolidateFeatures(productId, analysisId, fileAnalyses);

        // Update analysis as completed
        await supabase
          .from('codeql_analyses')
          .update({
            status: 'completed',
            progress: 100,
          })
          .eq('id', analysisId);

      } catch (error) {
        console.error('Background analysis error:', error);
        await supabase
          .from('codeql_analyses')
          .update({
            status: 'failed',
            progress: 0
          })
          .eq('id', analysisId);
      }
    })());

    return new Response(JSON.stringify({ id: analysisId }), {
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
