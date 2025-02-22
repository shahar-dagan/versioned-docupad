import { Feature } from '@/types';

export interface ExtendedFeature extends Feature {
  code_changes?: Array<{
    change_description: string;
    file_path: string;
    change_type: string;
    created_at: string;
    content?: string;
  }>;
  technical_docs?: {
    architecture?: string;
    setup?: string;
    api_details?: string;
    code_snippets?: Array<{
      language: string;
      code: string;
      description: string;
    }>;
    dependencies?: string[];
  };
  user_docs?: {
    overview?: string;
    steps?: string[];
    use_cases?: string[];
    visuals?: Array<{
      type: 'screenshot' | 'video';
      url: string;
      caption: string;
    }>;
    faq?: Array<{ question: string; answer: string }>;
  };
}

export interface UserFlow {
  action: string;
  prerequisites?: string[];
  steps: string[];
  expectedOutcome: string;
}

export interface FeatureContext {
  mainFeature: string;
  subFeature: string;
  userFlows: UserFlow[];
  relatedFeatures: string[];
}

export interface DocumentationPatterns {
  userInputs: Set<string>;
  userActions: Set<string>;
  dataOperations: Set<string>;
  uiComponents: Set<string>;
  featurePatterns: Set<string>;
  businessLogic: Set<string>;
  integrations: Set<string>;
  dataFlow: Set<string>;
}

export interface UserDocs {
  overview: string;
  steps: string[];
  use_cases: string[];
  faq: Array<{ question: string; answer: string }>;
}
