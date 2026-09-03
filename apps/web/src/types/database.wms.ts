/**
 * ВРЕМЕННАЯ ЗАПЛАТА.
 *
 * Джоб «Типы из схемы» в CI перестал отрабатывать после миграции 0012:
 * в database.gen.ts нет складских таблиц, и каждая сборка Netlify падала
 * на проверке типов. Сайт из-за этого замер на старом коммите.
 *
 * Здесь описаны недостающие части схемы вручную. Как только генерация
 * заработает, этот файл удаляется целиком, а database.ts перестаёт его
 * подмешивать. Пока он есть — рискует разойтись со схемой.
 */

import type { Database as Generated } from './database.gen'

export type StockReason =
  | 'receipt'
  | 'writeoff'
  | 'transfer_out'
  | 'transfer_in'
  | 'sale'
  | 'return'
  | 'inventory'
  | 'correction'

type WarehouseRow = {
  id: string
  tenant_id: string
  name: string
  code: string
  address: string | null
  is_default: boolean
  archived_at: string | null
  created_at: string
  updated_at: string
}

type MovementRow = {
  id: number
  tenant_id: string
  warehouse_id: string
  variant_id: string
  qty: number
  reason: StockReason
  doc_ref: string | null
  note: string | null
  actor_id: string | null
  created_at: string
}

export type WmsTables = {
  warehouses: {
    Row: WarehouseRow
    Insert: {
      id?: string
      tenant_id: string
      name: string
      code: string
      address?: string | null
      is_default?: boolean
      archived_at?: string | null
      created_at?: string
      updated_at?: string
    }
    Update: Partial<WarehouseRow>
    Relationships: []
  }
  stock_movements: {
    Row: MovementRow
    Insert: {
      tenant_id: string
      warehouse_id: string
      variant_id: string
      qty: number
      reason: StockReason
      doc_ref?: string | null
      note?: string | null
      actor_id?: string | null
      created_at?: string
    }
    Update: Partial<MovementRow>
    Relationships: []
  }
}

export type StockReportRow = {
  variant_id: string
  sku: string
  barcode: string | null
  product_id: string
  product_name: string
  warehouse_id: string
  warehouse_name: string
  qty: number
  total_count: number
}

export type StockJournalRow = {
  id: number
  created_at: string
  warehouse_id: string
  warehouse_name: string
  variant_id: string
  sku: string
  product_name: string
  qty: number
  reason: StockReason
  doc_ref: string | null
  note: string | null
  actor_name: string | null
  total_count: number
}

export type WmsFunctions = {
  stock_report: {
    Args: {
      p_tenant: string
      p_warehouse?: string
      p_search?: string
      p_limit?: number
      p_offset?: number
    }
    Returns: StockReportRow[]
  }
  stock_journal: {
    Args: {
      p_tenant: string
      p_warehouse?: string
      p_variant?: string
      p_limit?: number
      p_offset?: number
    }
    Returns: StockJournalRow[]
  }
  transfer_stock: {
    Args: {
      p_tenant: string
      p_variant: string
      p_from: string
      p_to: string
      p_qty: number
      p_note?: string
    }
    Returns: undefined
  }
  seed_demo_data: {
    Args: { p_tenant: string }
    Returns: string
  }
}

type Pub = Generated['public']

/** Схема с добавленными складскими таблицами, функциями и перечислением. */
export type DatabaseWithWms = Omit<Generated, 'public'> & {
  public: Omit<Pub, 'Tables' | 'Functions' | 'Enums'> & {
    Tables: Pub['Tables'] & WmsTables
    Functions: Pub['Functions'] & WmsFunctions
    Enums: Pub['Enums'] & { stock_reason: StockReason }
  }
}
