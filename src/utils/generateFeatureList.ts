
import { analyzeFeatures } from './featureAnalysis';

export async function generateFeatureList(codebasePath: string) {
  const analysisResult = await analyzeFeatures(codebasePath);
  
  const featureList: Record<string, string[]> = {
    components: analysisResult.components.map(c => c.name),
    functionality: analysisResult.functionality.map(f => f.name),
    dataOperations: analysisResult.dataOperations.map(op => op.type),
    security: analysisResult.security.map(s => s.type)
  };

  return featureList;
}
