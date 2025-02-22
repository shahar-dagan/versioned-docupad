
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
}

export interface Repository {
  id: string;
  repository_name: string;
  product_id: string;
  repository_url?: string;
  repository_id?: string;
}
