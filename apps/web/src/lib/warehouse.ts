import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { Enums } from '../types/database'

/**
 * Слой данных склада.
 *
 * Остатки и журнал читаются функциями базы: остаток лежит в представлении,
 * а название товара и артикул — в других таблицах, а у представления нет
 * внешних ключей, по которым PostgREST строит связи.
 *
 * Запись в журнал — только вставка. Правки и удаления нет ни здесь,
 * ни в базе: на stock_movements просто нет соответствующих политик.
 */

export const STOCK_PAGE_SIZE = 50

const UNIQUE_VIOLATION = '23505'

export type Warehouse = {
  id: string
  name: string
  code: string
  address: string | null
  is_default: boolean
}

export function useWarehouses(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['warehouses', tenantId],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('id, name, code, address, is_default')
        .eq('tenant_id', tenantId!)
        .is('archived_at', null)
        .order('is_default', { ascending: false })
        .order('name')
      if (error) throw new Error(error.message)
      return (data ?? []) as Warehouse[]
    },
  })
}

export type NewWarehouse = {
  name: string
  code: string
  address: string
  isDefault: boolean
}

export function useCreateWarehouse(tenantId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (w: NewWarehouse) => {
      // Склад по умолчанию в компании только один — это частичный
      // уникальный индекс в базе. Снимаем признак со старого заранее.
      if (w.isDefault) {
        const { error: clearErr } = await supabase
          .from('warehouses')
          .update({ is_default: false })
          .eq('tenant_id', tenantId!)
          .eq('is_default', true)
        if (clearErr) throw new Error(clearErr.message)
      }

      const { error } = await supabase.from('warehouses').insert({
        tenant_id: tenantId!,
        name: w.name.trim(),
        code: w.code.trim().toUpperCase(),
        address: w.address.trim() || null,
        is_default: w.isDefault,
      })
      if (error) {
        throw new Error(error.code === UNIQUE_VIOLATION ? 'code_taken' : error.message)
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['warehouses'] })
    },
  })
}

export function useArchiveWarehouse(tenantId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      // Мягкое удаление: у журнала внешний ключ on delete restrict,
      // и физическое удаление склада с движениями база не даст.
      const { error } = await supabase
        .from('warehouses')
        .update({ archived_at: new Date().toISOString(), is_default: false })
        .eq('id', id)
        .eq('tenant_id', tenantId!)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['warehouses'] })
      void qc.invalidateQueries({ queryKey: ['stock'] })
    },
  })
}

export type StockRow = {
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

export function useStockReport(
  tenantId: string | undefined,
  f: { warehouseId: string; search: string; page: number },
) {
  return useQuery({
    queryKey: ['stock', tenantId, f.warehouseId, f.search, f.page],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('stock_report', {
        p_tenant: tenantId!,
        p_warehouse: f.warehouseId || undefined,
        p_search: f.search.trim() || undefined,
        p_limit: STOCK_PAGE_SIZE,
        p_offset: f.page * STOCK_PAGE_SIZE,
      })
      if (error) throw new Error(error.message)
      const rows = (data ?? []) as unknown as StockRow[]
      return { rows, total: rows[0]?.total_count ?? 0 }
    },
  })
}

export type JournalRow = {
  id: number
  created_at: string
  warehouse_id: string
  warehouse_name: string
  variant_id: string
  sku: string
  product_name: string
  qty: number
  reason: Enums<'stock_reason'>
  doc_ref: string | null
  note: string | null
  actor_name: string | null
  total_count: number
}

export function useStockJournal(
  tenantId: string | undefined,
  f: { warehouseId: string; page: number },
) {
  return useQuery({
    queryKey: ['journal', tenantId, f.warehouseId, f.page],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('stock_journal', {
        p_tenant: tenantId!,
        p_warehouse: f.warehouseId || undefined,
        p_limit: STOCK_PAGE_SIZE,
        p_offset: f.page * STOCK_PAGE_SIZE,
      })
      if (error) throw new Error(error.message)
      const rows = (data ?? []) as unknown as JournalRow[]
      return { rows, total: rows[0]?.total_count ?? 0 }
    },
  })
}

export type VariantOption = {
  id: string
  sku: string
  barcode: string | null
  productName: string
}

/**
 * Поиск варианта для операции.
 *
 * Искать через отчёт по остаткам нельзя: товар, который принимают впервые,
 * в остатках ещё не существует — у него нет ни одного движения.
 *
 * Два запроса со слиянием: условие «артикул ИЛИ название товара» идёт
 * через связь, а PostgREST одним запросом такое не выражает.
 */
export function useVariantSearch(tenantId: string | undefined, term: string) {
  const q = term.trim()
  return useQuery({
    queryKey: ['variant-search', tenantId, q],
    enabled: Boolean(tenantId) && q.length >= 2,
    queryFn: async () => {
      const pattern = `%${q}%`

      const byCode = supabase
        .from('product_variants')
        .select('id, sku, barcode, products(name)')
        .eq('tenant_id', tenantId!)
        .is('archived_at', null)
        .or(`sku.ilike.${pattern},barcode.ilike.${pattern}`)
        .limit(20)

      const byName = supabase
        .from('product_variants')
        .select('id, sku, barcode, products!inner(name)')
        .eq('tenant_id', tenantId!)
        .is('archived_at', null)
        .ilike('products.name', pattern)
        .limit(20)

      const [codeRes, nameRes] = await Promise.all([byCode, byName])
      if (codeRes.error) throw new Error(codeRes.error.message)
      if (nameRes.error) throw new Error(nameRes.error.message)

      type Raw = {
        id: string
        sku: string
        barcode: string | null
        products: { name: string } | null
      }

      const merged = new Map<string, VariantOption>()
      for (const r of [...(codeRes.data ?? []), ...(nameRes.data ?? [])] as unknown as Raw[]) {
        merged.set(r.id, {
          id: r.id,
          sku: r.sku,
          barcode: r.barcode,
          productName: r.products?.name ?? '',
        })
      }

      return [...merged.values()].slice(0, 25)
    },
  })
}

export type SimpleReason = Extract<
  Enums<'stock_reason'>,
  'receipt' | 'writeoff' | 'correction' | 'inventory'
>

export type SimpleMove = {
  warehouseId: string
  variantId: string
  qty: string
  reason: SimpleReason
  docRef: string
  note: string
}

/** Приёмка, списание и поправка — одна строка журнала. */
export function useStockMove(tenantId: string | undefined, userId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (m: SimpleMove) => {
      const amount = Number(m.qty)
      if (!Number.isFinite(amount) || amount <= 0) throw new Error('bad_qty')

      // Знак ставится здесь, а не вводится руками: минус в поле количества —
      // самая лёгкая опечатка на складе, и цена её высока.
      const signed = m.reason === 'receipt' ? amount : -amount

      const { error } = await supabase.from('stock_movements').insert({
        tenant_id: tenantId!,
        warehouse_id: m.warehouseId,
        variant_id: m.variantId,
        qty: signed,
        reason: m.reason,
        doc_ref: m.docRef.trim() || null,
        note: m.note.trim() || null,
        actor_id: userId ?? null,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['stock'] })
      void qc.invalidateQueries({ queryKey: ['journal'] })
    },
  })
}

export type TransferMove = {
  variantId: string
  fromId: string
  toId: string
  qty: string
  note: string
}

/** Перемещение — через функцию базы: списание и приход неразделимы. */
export function useTransferStock(tenantId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (t: TransferMove) => {
      const amount = Number(t.qty)
      if (!Number.isFinite(amount) || amount <= 0) throw new Error('bad_qty')

      const { error } = await supabase.rpc('transfer_stock', {
        p_tenant: tenantId!,
        p_variant: t.variantId,
        p_from: t.fromId,
        p_to: t.toId,
        p_qty: amount,
        p_note: t.note.trim() || undefined,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['stock'] })
      void qc.invalidateQueries({ queryKey: ['journal'] })
    },
  })
}

/** Количество без лишних нулей: 5 вместо 5.000, но 1.5 остаётся 1.5. */
export function formatQty(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(value)
}
