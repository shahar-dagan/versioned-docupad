
import { FeatureAnalyzer } from './featureAnalysis';

export async function generateFeatureList(codebasePath: string) {
  const analyzer = new FeatureAnalyzer();
  const categories = await analyzer.analyzeCodebase(codebasePath);

  const featureList: Record<string, string[]> = {};

  for (const [category, data] of categories.entries()) {
    featureList[category] = Array.from(data.features);
  }

  return featureList;
}
