
export interface Feature {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  created_at: string;
  last_analyzed_at: string | null;
  suggestions?: string[];
  code_changes?: {
    change_description: string;
    created_at: string;
  }[];
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
    type?: 'user_action' | 'display' | 'navigation' | 'feedback' | 'form';
    location?: string;
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
  repository_url: string;
  repository_id: string;
}
