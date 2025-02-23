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
  try {
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

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.choices?.[0]?.message?.content) {
      console.error('Invalid OpenAI response format:', data);
      throw new Error('Invalid response format from OpenAI');
    }

    const parsedContent = JSON.parse(data.choices[0].message.content);
    
    if (!parsedContent.features || !Array.isArray(parsedContent.features)) {
      console.error('Invalid features format:', parsedContent);
      return {
        features: [{
          name: "Error analyzing file",
          description: "Failed to parse file features",
          confidence: 0,
          location: filePath,
          type: "error",
          dependencies: []
        }]
      };
    }

    return parsedContent;
  } catch (error) {
    console.error('Error analyzing file content:', error);
    return {
      features: [{
        name: "Error analyzing file",
        description: error.message || "Unknown error occurred",
        confidence: 0,
        location: filePath,
        type: "error",
        dependencies: []
      }]
    };
  }
}

async function checkFileAnalysisCache(
  productId: string,
  repositoryName: string,
  filePath: string,
  contentHash: string
): Promise<any> {
  const { data, error } = await supabase
    .from('file_analyses')
    .select('*')
    .eq('product_id', productId)
    .eq('repository_name', repositoryName)
    .eq('file_path', filePath)
    .eq('file_content_hash', contentHash)
    .maybeSingle();

  if (error) {
    console.error('Error checking file analysis cache:', error);
    return null;
  }

  return data;
}

async function getLastProcessedFile(analysisId: string) {
  const { data, error } = await supabase
    .from('codeql_analyses')
    .select('analysis_results')
    .eq('id', analysisId)
    .single();

  if (error) {
    console.error('Error fetching last processed file:', error);
    return null;
  }

  return data?.analysis_results?.last_processed_file || null;
}

async function updateAnalysisProgress(
  analysisId: string, 
  progress: number | null, 
  step: { step: string; timestamp: string },
  lastProcessedFile?: string
) {
  console.log('Updating analysis progress:', { analysisId, progress, step, lastProcessedFile });
  
  try {
    const { data: currentAnalysis, error: fetchError } = await supabase
      .from('codeql_analyses')
      .select('steps, analysis_results')
      .eq('id', analysisId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching current analysis:', fetchError);
      return;
    }

    const currentSteps = Array.isArray(currentAnalysis?.steps) ? currentAnalysis.steps : [];
    const updatedSteps = [...currentSteps, step];

    const analysisResults = {
      ...(currentAnalysis?.analysis_results || {}),
      ...(lastProcessedFile ? { last_processed_file: lastProcessedFile } : {})
    };

    const { error: updateError } = await supabase
      .from('codeql_analyses')
      .update({
        progress,
        status: progress === 100 ? 'completed' : 'in_progress',
        steps: updatedSteps,
        analysis_results: analysisResults
      })
      .eq('id', analysisId);

    if (updateError) {
      console.error('Error updating analysis progress:', updateError);
    }
  } catch (error) {
    console.error('Error in updateAnalysisProgress:', error);
  }
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

    console.log('Starting analysis with params:', { repoFullName, productId, userId, analysisId });

    const backgroundTask = async () => {
      try {
        const lastProcessedFile = await getLastProcessedFile(analysisId);
        let resuming = !!lastProcessedFile;

        await updateAnalysisProgress(analysisId, resuming ? null : 0, {
          step: resuming ? `Resuming analysis from ${lastProcessedFile}` : 'Fetching repository structure',
          timestamp: new Date().toISOString()
        });

        const response = await fetch(`https://api.github.com/repos/${repoFullName}/git/trees/main?recursive=1`, {
          headers: { 'Authorization': `Bearer ${Deno.env.get('GITHUB_ACCESS_TOKEN')}` }
        });
        
        if (!response.ok) {
          throw new Error(`GitHub API error: ${response.status}`);
        }

        const data = await response.json();
        const files = data.tree.filter((file: any) => 
          file.type === 'blob' && 
          (file.path.endsWith('.tsx') || file.path.endsWith('.jsx'))
        );

        let filesToProcess = files;
        if (resuming && lastProcessedFile) {
          const lastProcessedIndex = files.findIndex((f: any) => f.path === lastProcessedFile);
          if (lastProcessedIndex !== -1) {
            filesToProcess = files.slice(lastProcessedIndex + 1);
          }
        }

        await updateAnalysisProgress(analysisId, 5, {
          step: resuming 
            ? `Resuming with ${filesToProcess.length} remaining files to analyze` 
            : `Found ${files.length} files to analyze`,
          timestamp: new Date().toISOString()
        });

        const totalFiles = files.length;
        let processedFiles = resuming 
          ? files.length - filesToProcess.length 
          : 0;
        const fileAnalyses = [];
        const processedPaths = new Set();

        for (const file of filesToProcess) {
          try {
            const cachedAnalysis = await checkFileAnalysisCache(productId, repoFullName, file.path, file.sha);
            
            if (cachedAnalysis) {
              processedFiles++;
              await updateAnalysisProgress(
                analysisId, 
                Math.round((processedFiles / totalFiles) * 95) + 5, 
                {
                  step: `Using cached analysis for ${file.path}`,
                  timestamp: new Date().toISOString()
                },
                file.path
              );
              
              fileAnalyses.push(cachedAnalysis);
              processedPaths.add(file.path);
              continue;
            }

            const fileResponse = await fetch(file.url, {
              headers: { 'Authorization': `Bearer ${Deno.env.get('GITHUB_ACCESS_TOKEN')}` }
            });
            
            if (!fileResponse.ok) {
              throw new Error(`Failed to fetch file content: ${fileResponse.status}`);
            }

            const fileData = await fileResponse.json();
            const fileContent = atob(fileData.content);
            
            await updateAnalysisProgress(
              analysisId, 
              null, 
              {
                step: `Analyzing ${file.path}`,
                timestamp: new Date().toISOString()
              },
              file.path
            );

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

            processedPaths.add(file.path);
            processedFiles++;
            
            const progress = Math.round((processedFiles / totalFiles) * 95) + 5;
            
            await updateAnalysisProgress(
              analysisId, 
              progress, 
              {
                step: `Completed analysis of ${file.path}`,
                timestamp: new Date().toISOString()
              },
              file.path
            );

          } catch (error) {
            console.error(`Error analyzing file ${file.path}:`, error);
            await updateAnalysisProgress(
              analysisId, 
              null, 
              {
                step: `Error analyzing ${file.path}: ${error.message}`,
                timestamp: new Date().toISOString()
              },
              file.path
            );
          }
        }

        await updateAnalysisProgress(analysisId, 98, {
          step: 'Consolidating feature analysis results',
          timestamp: new Date().toISOString()
        });

        await consolidateFeatures(productId, analysisId, fileAnalyses);

        await updateAnalysisProgress(analysisId, 100, {
          step: 'Analysis completed',
          timestamp: new Date().toISOString()
        });

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
            progress: 0,
            error_message: error.message
          })
          .eq('id', analysisId);
      }
    };

    EdgeRuntime.waitUntil(backgroundTask());

    return new Response(JSON.stringify({ 
      message: 'Analysis started',
      id: analysisId 
    }), {
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
