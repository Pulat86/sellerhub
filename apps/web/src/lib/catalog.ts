import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { Enums } from '../types/database'

/**
 * Слой данных каталога.
 *
 * Список товаров идёт через функцию search_products, а не прямым запросом:
 * поиск должен находить и по названию товара, и по артикулу с штрихкодом варианта,
 * а это условие через связь PostgREST одним запросом не выражает.
 *
 * Функция объявлена как security invoker, то есть RLS применяется к вызывающему.
 * Справочники категорий и брендов читаются напрямую — там обычный список.
 */

export const PAGE_SIZE = 25

export type ProductRow = {
  id: string
  name: string
  category_id: string | null
  brand_id: string | null
  category_name: string | null
  brand_name: string | null
  sku: string | null
  barcode: string | null
  cost_price: number | null
  cost_currency: Enums<'currency'>
  variant_count: number
  created_at: string
  total_count: number
}

export type ProductFilters = {
  search: string
  categoryId: string
  brandId: string
  page: number
}

export function useProducts(tenantId: string | undefined, f: ProductFilters) {
  return useQuery({
    queryKey: ['products', tenantId, f.search, f.categoryId, f.brandId, f.page],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('search_products', {
        p_tenant: tenantId!,
        p_search: f.search.trim() || undefined,
        p_category: f.categoryId || undefined,
        p_brand: f.brandId || undefined,
        p_limit: PAGE_SIZE,
        p_offset: f.page * PAGE_SIZE,
      })

      if (error) throw new Error(error.message)

      const rows = (data ?? []) as unknown as ProductRow[]
      // Общее число совпавших товаров функция кладёт в каждую строку
      // оконной функцией — второй запрос на подсчёт не нужен.
      return { rows, total: rows[0]?.total_count ?? 0 }
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
