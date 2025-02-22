export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      code_changes: {
        Row: {
          author_id: string
          change_description: string
          change_type: string
          commit_hash: string | null
          created_at: string
          feature_id: string
          file_path: string
          id: string
        }
        Insert: {
          author_id: string
          change_description: string
          change_type: string
          commit_hash?: string | null
          created_at?: string
          feature_id: string
          file_path: string
          id?: string
        }
        Update: {
          author_id?: string
          change_description?: string
          change_type?: string
          commit_hash?: string | null
          created_at?: string
          feature_id?: string
          file_path?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "code_changes_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
        ]
      }
      codeql_analyses: {
        Row: {
          analysis_date: string | null
          analysis_results: Json | null
          created_at: string | null
          id: string
          product_id: string | null
          repository_id: string | null
          summary: string | null
          updated_at: string | null
        }
        Insert: {
          analysis_date?: string | null
          analysis_results?: Json | null
          created_at?: string | null
          id?: string
          product_id?: string | null
          repository_id?: string | null
          summary?: string | null
          updated_at?: string | null
        }
        Update: {
          analysis_date?: string | null
          analysis_results?: Json | null
          created_at?: string | null
          id?: string
          product_id?: string | null
          repository_id?: string | null
          summary?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "codeql_analyses_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "codeql_analyses_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "github_repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          author_id: string | null
          content: string
          created_at: string | null
          document_id: string | null
          id: string
          title: string
          version: number
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string | null
          document_id?: string | null
          id?: string
          title: string
          version: number
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string | null
          document_id?: string | null
          id?: string
          title?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documentation: {
        Row: {
          author_id: string
          content: string
          created_at: string
          feature_id: string
          id: string
          title: string
          updated_at: string
          version: number | null
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          feature_id: string
          id?: string
          title: string
          updated_at?: string
          version?: number | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          feature_id?: string
          id?: string
          title?: string
          updated_at?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documentation_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          author_id: string
          content: string | null
          created_at: string | null
          id: string
          parent_id: string | null
          status: Database["public"]["Enums"]["document_status"] | null
          title: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          author_id: string
          content?: string | null
          created_at?: string | null
          id?: string
          parent_id?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          title: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          author_id?: string
          content?: string | null
          created_at?: string | null
          id?: string
          parent_id?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          title?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_file_changes: {
        Row: {
          analyzed: boolean | null
          changed_at: string | null
          feature_id: string | null
          file_hash: string
          file_path: string
          id: string
        }
        Insert: {
          analyzed?: boolean | null
          changed_at?: string | null
          feature_id?: string | null
          file_hash: string
          file_path: string
          id?: string
        }
        Update: {
          analyzed?: boolean | null
          changed_at?: string | null
          feature_id?: string | null
          file_hash?: string
          file_path?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_file_changes_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
        ]
      }
      features: {
        Row: {
          author_id: string
          code_version: string | null
          created_at: string
          description: string | null
          id: string
          last_analyzed_at: string | null
          last_code_hash: string | null
          name: string
          product_id: string
          status: string | null
          suggestions: string[] | null
          technical_docs: Json | null
          updated_at: string
          user_docs: Json | null
        }
        Insert: {
          author_id: string
          code_version?: string | null
          created_at?: string
          description?: string | null
          id?: string
          last_analyzed_at?: string | null
          last_code_hash?: string | null
          name: string
          product_id: string
          status?: string | null
          suggestions?: string[] | null
          technical_docs?: Json | null
          updated_at?: string
          user_docs?: Json | null
        }
        Update: {
          author_id?: string
          code_version?: string | null
          created_at?: string
          description?: string | null
          id?: string
          last_analyzed_at?: string | null
          last_code_hash?: string | null
          name?: string
          product_id?: string
          status?: string | null
          suggestions?: string[] | null
          technical_docs?: Json | null
          updated_at?: string
          user_docs?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "features_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      github_repositories: {
        Row: {
          created_at: string | null
          enterprise_enabled: boolean | null
          enterprise_url: string | null
          id: string
          product_id: string | null
          repository_id: string
          repository_name: string
          repository_url: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enterprise_enabled?: boolean | null
          enterprise_url?: string | null
          id?: string
          product_id?: string | null
          repository_id: string
          repository_name: string
          repository_url: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enterprise_enabled?: boolean | null
          enterprise_url?: string | null
          id?: string
          product_id?: string | null
          repository_id?: string
          repository_name?: string
          repository_url?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "github_repositories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          author_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          author_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          id: string
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          id: string
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      secrets: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          role: string
          team_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          team_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          team_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_user: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
    }
    Enums: {
      document_status: "draft" | "published" | "archived"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
