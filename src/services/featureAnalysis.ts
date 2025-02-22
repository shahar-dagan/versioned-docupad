interface Feature {
  name: string;
  description: string;
  category: string;
  user_interactions: string[];
}

interface AnalysisResponse {
  features: Feature[];
  categories: string[];
}

export const analyzeCodebase = async (repositoryPath: string): Promise<AnalysisResponse> => {
  try {
    const response = await fetch('http://localhost:8000/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ repository_path: repositoryPath }),
    });

    if (!response.ok) {
      throw new Error('Analysis failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Error analyzing codebase:', error);
    throw error;
  }
}; 