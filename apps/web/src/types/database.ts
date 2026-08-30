/**
 * Типы схемы базы. Сгенерированы Supabase — руками не правим.
 *
 * Пересоздать после каждой миграции:
 *   supabase gen types --lang typescript --linked > src/types/database.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
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
            foreignKeyName: 'audit_log_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          id: string
          role: Database['public']['Enums']['member_role']
          status: Database['public']['Enums']['member_status']
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database['public']['Enums']['member_role']
          status?: Database['public']['Enums']['member_status']
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database['public']['Enums']['member_role']
          status?: Database['public']['Enums']['member_status']
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'memberships_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
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
          marketplace: Database['public']['Enums']['marketplace']
          max_attempts: number
          next_run_at: string
          payload: Json
          priority: number
          status: Database['public']['Enums']['job_status']
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
          marketplace: Database['public']['Enums']['marketplace']
          max_attempts?: number
          next_run_at?: string
          payload?: Json
          priority?: number
          status?: Database['public']['Enums']['job_status']
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
          marketplace?: Database['public']['Enums']['marketplace']
          max_attempts?: number
          next_run_at?: string
          payload?: Json
          priority?: number
          status?: Database['public']['Enums']['job_status']
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sync_jobs_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
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
          from: '*'
          to: 'tenants'
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      job_status: 'pending' | 'running' | 'succeeded' | 'failed' | 'dead'
      marketplace: 'uzum' | 'wildberries' | 'ozon' | 'yandex_market'
      member_role: 'owner' | 'admin' | 'manager' | 'warehouse' | 'viewer'
      member_status: 'active' | 'invited' | 'disabled'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database['public']

export type Tables<T extends keyof DefaultSchema['Tables']> =
  DefaultSchema['Tables'][T]['Row']

export type Enums<T extends keyof DefaultSchema['Enums']> =
  DefaultSchema['Enums'][T]

export type Tenant = Tables<'tenants'>
export type Membership = Tables<'memberships'>
export type Profile = Tables<'profiles'>
export type SyncJob = Tables<'sync_jobs'>

export type MemberRole = Enums<'member_role'>
export type MemberStatus = Enums<'member_status'>
export type Marketplace = Enums<'marketplace'>
export type JobStatus = Enums<'job_status'>
