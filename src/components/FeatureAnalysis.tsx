import React, { useState } from "react";
import { analyzeCodebase } from "../services/featureAnalysis";

interface Feature {
  name: string;
  description: string;
  category: string;
  user_interactions: string[];
}

export const FeatureAnalysis: React.FC = () => {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (repositoryPath: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await analyzeCodebase(repositoryPath);
      setFeatures(result.features);
      setCategories(result.categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {loading && <div>Analyzing codebase...</div>}
      {error && <div className="error">{error}</div>}

      <div className="categories">
        {categories.map((category) => (
          <div key={category} className="category">
            <h2>{category}</h2>
            <div className="features">
              {features
                .filter((f) => f.category === category)
                .map((feature) => (
                  <div key={feature.name} className="feature-card">
                    <h3>{feature.name}</h3>
                    <p>{feature.description}</p>
                    <ul>
                      {feature.user_interactions.map((interaction) => (
                        <li key={interaction}>{interaction}</li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
