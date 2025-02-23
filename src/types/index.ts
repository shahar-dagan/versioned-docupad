
export interface Feature {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  created_at: string;
  last_analyzed_at: string | null;
  suggestions?: string[];
  code_changes?: CodeChange[];
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
    faq?: Array<{ question: string; answer: string }>;
  };
}

export interface Repository {
  id: string;
  repository_name: string;
  product_id: string;
  repository_url?: string;
  repository_id?: string;
}

export interface CodeChange {
  change_description: string;
  file_path: string;
  change_type: string;
  content?: string;
  created_at: string;
  user_workflows?: UserWorkflow[];
  visual_elements?: VisualElement[];
  navigation_patterns?: NavigationPattern[];
  error_handling?: ErrorHandling[];
  user_preferences?: UserPreference[];
}

export interface UserWorkflow {
  name: string;
  description: string;
  steps: string[];
  userProblemSolved: string;
}

export interface VisualElement {
  type: string;
  purpose: string;
  userFeedback: string;
  interactionMethod: string;
}

export interface NavigationPattern {
  type: string;
  purpose: string;
  userBenefit: string;
  contextualTriggers: string[];
}

export interface ErrorHandling {
  scenario: string;
  userGuidance: string;
  recoverySteps: string[];
  preventiveMeasures: string[];
}

export interface UserPreference {
  name: string;
  description: string;
  scope: string;
  persistence: 'session' | 'permanent';
  impact: string;
}
