/**
 * Точка входа для типов базы.
 *
 * Схема лежит в database.gen.ts — его перезаписывает CI после каждой миграции.
 * Этот файл переживает регенерацию, поэтому все псевдонимы и хелперы живут здесь.
 * Импортировать в приложении нужно отсюда, не из .gen.
 *
 * Пока генерация сломана, складская часть схемы берётся из database.wms.ts.
 */

export type { Json } from './database.gen'
export type { DatabaseWithWms as Database } from './database.wms'

import type { DatabaseWithWms as Database } from './database.wms'

type DefaultSchema = Database['public']

export type Tables<T extends keyof DefaultSchema['Tables']> =
  DefaultSchema['Tables'][T]['Row']

export type TablesInsert<T extends keyof DefaultSchema['Tables']> =
  DefaultSchema['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof DefaultSchema['Tables']> =
  DefaultSchema['Tables'][T]['Update']

export type Enums<T extends keyof DefaultSchema['Enums']> =
  DefaultSchema['Enums'][T]

// Ядро
export type Tenant = Tables<'tenants'>
export type Membership = Tables<'memberships'>
export type Profile = Tables<'profiles'>
export type SyncJob = Tables<'sync_jobs'>

export type MemberRole = Enums<'member_role'>
export type MemberStatus = Enums<'member_status'>
export type Marketplace = Enums<'marketplace'>
export type JobStatus = Enums<'job_status'>
