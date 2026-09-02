import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { Enums, Tables } from '../types/database'

/**
 * Слой данных каталога.
 *
 * Все запросы явно фильтруются по tenant_id, хотя RLS и так не отдаст чужое.
 * Причина не в безопасности: пользователь может состоять в двух компаниях,
 * и без фильтра в каталоге перемешались бы товары обеих.
 */

export const PAGE_SIZE = 25

export type VariantBrief = Pick<
  Tables<'product_variants'>,
  'id' | 'sku' | 'barcode' | 'cost_price' | 'cost_currency'
>

export type ProductRow = Tables<'products'> & {
  brands: { name: string } | null
  categories: { name: string } | null
  product_variants: VariantBrief[]
}

export type ProductFilters = {
  search: string
  categoryId: string
  brandId: string
  page: number
}

const PRODUCT_SELECT =
  'id, tenant_id, name, description, has_variants, archived_at, created_at, updated_at, ' +
  'category_id, brand_id, ' +
  'brands(name), categories(name), ' +
  'product_variants(id, sku, barcode, cost_price, cost_currency)'

export function useProducts(tenantId: string | undefined, f: ProductFilters) {
  return useQuery({
    queryKey: ['products', tenantId, f.search, f.categoryId, f.brandId, f.page],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      const from = f.page * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      let q = supabase
        .from('products')
        .select(PRODUCT_SELECT, { count: 'exact' })
        .eq('tenant_id', tenantId!)
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .range(from, to)

      // Поиск по названию опирается на триграммный индекс из миграции 0011.
      // Поиск по SKU и штрихкоду требует условия «name ИЛИ sku» через связь,
      // а это PostgREST одним запросом не выражает. Будет отдельной функцией в базе —
      // та же функция потом послужит сканеру штрихкодов на складе.
      const term = f.search.trim()
      if (term) q = q.ilike('name', `%${term}%`)

      if (f.categoryId) q = q.eq('category_id', f.categoryId)
      if (f.brandId) q = q.eq('brand_id', f.brandId)

      const { data, error, count } = await q
      if (error) throw new Error(error.message)

      return {
        rows: (data ?? []) as unknown as ProductRow[],
        total: count ?? 0,
      }
    },
  })
}

export function useCategories(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['categories', tenantId],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, parent_id, sort')
        .eq('tenant_id', tenantId!)
        .order('sort')
        .order('name')
      if (error) throw new Error(error.message)
      return data ?? []
    },
  })
}

export function useBrands(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['brands', tenantId],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('id, name')
        .eq('tenant_id', tenantId!)
        .order('name')
      if (error) throw new Error(error.message)
      return data ?? []
    },
  })
}

export type NewProduct = {
  name: string
  sku: string
  barcode: string
  categoryId: string
  brandId: string
  costPrice: string
  currency: Enums<'currency'>
}

export function useCreateProduct(tenantId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: NewProduct) => {
      // Товар и его первый вариант создаются одной функцией в базе.
      // Два отдельных запроса при обрыве связи оставили бы товар без SKU.
      const { data, error } = await supabase.rpc('create_product', {
        p_tenant: tenantId!,
        p_name: p.name.trim(),
        p_sku: p.sku.trim(),
        p_barcode: p.barcode.trim() || undefined,
        p_category_id: p.categoryId || undefined,
        p_brand_id: p.brandId || undefined,
        p_cost_price: p.costPrice ? Number(p.costPrice) : undefined,
        p_currency: p.currency,
      })
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

/** Форматирование денег. Считает база, фронт только показывает. */
export function formatMoney(value: number | null, currency: string, locale: string): string {
  if (value === null || value === undefined) return '—'
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `${value} ${currency}`
  }
}
