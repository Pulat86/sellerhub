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
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          diff: Json | null
          entity_id: string | null
          entity_type: string
          id: number
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          diff?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: never
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          diff?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: never
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brands_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
          slug: string
          sort: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          slug: string
          sort?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
          sort?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_fk"
            columns: ["parent_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_listings: {
        Row: {
          created_at: string
          external_id: string
          external_sku: string | null
          id: string
          last_error: string | null
          last_synced_at: string | null
          marketplace: Database["public"]["Enums"]["marketplace"]
          status: Database["public"]["Enums"]["listing_status"]
          tenant_id: string
          updated_at: string
          url: string | null
          variant_id: string
        }
        Insert: {
          created_at?: string
          external_id: string
          external_sku?: string | null
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          marketplace: Database["public"]["Enums"]["marketplace"]
          status?: Database["public"]["Enums"]["listing_status"]
          tenant_id: string
          updated_at?: string
          url?: string | null
          variant_id: string
        }
        Update: {
          created_at?: string
          external_id?: string
          external_sku?: string | null
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          marketplace?: Database["public"]["Enums"]["marketplace"]
          status?: Database["public"]["Enums"]["listing_status"]
          tenant_id?: string
          updated_at?: string
          url?: string | null
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_listings_variant_fk"
            columns: ["variant_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id", "tenant_id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["member_role"]
          status: Database["public"]["Enums"]["member_status"]
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["member_role"]
          status?: Database["public"]["Enums"]["member_status"]
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["member_role"]
          status?: Database["public"]["Enums"]["member_status"]
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt: string | null
          created_at: string
          id: string
          product_id: string
          sort: number
          storage_path: string
          tenant_id: string
          variant_id: string | null
        }
        Insert: {
          alt?: string | null
          created_at?: string
          id?: string
          product_id: string
          sort?: number
          storage_path: string
          tenant_id: string
          variant_id?: string | null
        }
        Update: {
          alt?: string | null
          created_at?: string
          id?: string
          product_id?: string
          sort?: number
          storage_path?: string
          tenant_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_fk"
            columns: ["product_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "product_images_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_variant_fk"
            columns: ["variant_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id", "tenant_id"]
          },
        ]
      }
      product_variants: {
        Row: {
          archived_at: string | null
          attributes: Json
          barcode: string | null
          cost_currency: Database["public"]["Enums"]["currency"]
          cost_price: number | null
          created_at: string
          id: string
          name: string | null
          product_id: string
          sku: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          attributes?: Json
          barcode?: string | null
          cost_currency?: Database["public"]["Enums"]["currency"]
          cost_price?: number | null
          created_at?: string
          id?: string
          name?: string | null
          product_id: string
          sku: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          attributes?: Json
          barcode?: string | null
          cost_currency?: Database["public"]["Enums"]["currency"]
          cost_price?: number | null
          created_at?: string
          id?: string
          name?: string | null
          product_id?: string
          sku?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_fk"
            columns: ["product_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "product_variants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          archived_at: string | null
          brand_id: string | null
          category_id: string | null
          created_at: string
          description: string | null
          has_variants: boolean
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          brand_id?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          has_variants?: boolean
          id?: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          brand_id?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          has_variants?: boolean
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_fk"
            columns: ["brand_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "products_category_fk"
            columns: ["category_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          locale: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          locale?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          locale?: string
          updated_at?: string
        }
        Relationships: []
      }
      sync_jobs: {
        Row: {
          attempts: number
          created_at: string
          dedupe_key: string | null
          id: number
          job_type: string
          last_error: string | null
          locked_at: string | null
          locked_by: string | null
          marketplace: Database["public"]["Enums"]["marketplace"]
          max_attempts: number
          next_run_at: string
          payload: Json
          priority: number
          status: Database["public"]["Enums"]["job_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          dedupe_key?: string | null
          id?: never
          job_type: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          marketplace: Database["public"]["Enums"]["marketplace"]
          max_attempts?: number
          next_run_at?: string
          payload?: Json
          priority?: number
          status?: Database["public"]["Enums"]["job_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          dedupe_key?: string | null
          id?: never
          job_type?: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          marketplace?: Database["public"]["Enums"]["marketplace"]
          max_attempts?: number
          next_run_at?: string
          payload?: Json
          priority?: number
          status?: Database["public"]["Enums"]["job_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          locale: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          locale?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          locale?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_jobs: {
        Args: { p_limit?: number; p_worker?: string }
        Returns: {
          attempts: number
          created_at: string
          dedupe_key: string | null
          id: number
          job_type: string
          last_error: string | null
          locked_at: string | null
          locked_by: string | null
          marketplace: Database["public"]["Enums"]["marketplace"]
          max_attempts: number
          next_run_at: string
          payload: Json
          priority: number
          status: Database["public"]["Enums"]["job_status"]
          tenant_id: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "sync_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      create_product: {
        Args: {
          p_barcode?: string
          p_brand_id?: string
          p_category_id?: string
          p_cost_price?: number
          p_currency?: Database["public"]["Enums"]["currency"]
          p_description?: string
          p_name: string
          p_sku: string
          p_tenant: string
        }
        Returns: {
          archived_at: string | null
          brand_id: string | null
          category_id: string | null
          created_at: string
          description: string | null
          has_variants: boolean
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_tenant: {
        Args: { p_name: string; p_slug: string }
        Returns: {
          created_at: string
          id: string
          locale: string
          name: string
          slug: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "tenants"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      enqueue_job: {
        Args: {
          p_dedupe_key?: string
          p_job_type: string
          p_marketplace: Database["public"]["Enums"]["marketplace"]
          p_payload?: Json
          p_priority?: number
          p_tenant: string
        }
        Returns: number
      }
      finish_job: {
        Args: { p_error?: string; p_id: number; p_ok: boolean }
        Returns: undefined
      }
      search_products: {
        Args: {
          p_brand?: string
          p_category?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_tenant: string
        }
        Returns: Database["public"]["CompositeTypes"]["product_search_row"][]
        SetofOptions: {
          from: "*"
          to: "product_search_row"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      currency: "UZS" | "USD" | "RUB" | "KZT" | "EUR"
      job_status: "pending" | "running" | "succeeded" | "failed" | "dead"
      listing_status: "pending" | "active" | "inactive" | "error"
      marketplace: "uzum" | "wildberries" | "ozon" | "yandex_market"
      member_role: "owner" | "admin" | "manager" | "warehouse" | "viewer"
      member_status: "active" | "invited" | "disabled"
    }
    CompositeTypes: {
      product_search_row: {
        id: string | null
        name: string | null
        category_id: string | null
        brand_id: string | null
        category_name: string | null
        brand_name: string | null
        sku: string | null
        barcode: string | null
        cost_price: number | null
        cost_currency: Database["public"]["Enums"]["currency"] | null
        variant_count: number | null
        created_at: string | null
        total_count: number | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      currency: ["UZS", "USD", "RUB", "KZT", "EUR"],
      job_status: ["pending", "running", "succeeded", "failed", "dead"],
      listing_status: ["pending", "active", "inactive", "error"],
      marketplace: ["uzum", "wildberries", "ozon", "yandex_market"],
      member_role: ["owner", "admin", "manager", "warehouse", "viewer"],
      member_status: ["active", "invited", "disabled"],
    },
  },
} as const

