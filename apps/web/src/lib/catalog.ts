import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import { slugify } from './slug'
import type { Enums } from '../types/database'

/**
 * Слой данных каталога.
 *
 * Список товаров идёт через функцию search_products, а не прямым запросом:
 * поиск должен находить и по названию товара, и по артикулу со штрихкодом варианта,
 * а это условие через связь PostgREST одним запросом не выражает.
 *
 * Справочники и карточка читаются напрямую — там обычные запросы.
 */

export const PAGE_SIZE = 25

/** Сколько раз пробуем подобрать свободный slug при совпадении. */
const SLUG_ATTEMPTS = 5

/** Коды ошибок Postgres, которые разбираются адресно. */
const UNIQUE_VIOLATION = '23505'

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
      // Общее число совпавших функция кладёт в каждую строку оконной
      // функцией — второй запрос на подсчёт не нужен.
      return { rows, total: rows[0]?.total_count ?? 0 }
    },
  })
}

// ============================================================
// КАРТОЧКА ТОВАРА
// ============================================================

export type ProductDetail = {
  id: string
  name: string
  description: string | null
  category_id: string | null
  brand_id: string | null
  archived_at: string | null
  created_at: string
}

export function useProduct(tenantId: string | undefined, productId: string | undefined) {
  return useQuery({
    queryKey: ['product', tenantId, productId],
    enabled: Boolean(tenantId && productId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, description, category_id, brand_id, archived_at, created_at')
        .eq('id', productId!)
        .eq('tenant_id', tenantId!)
        .maybeSingle()

      if (error) throw new Error(error.message)
      // Не нашли — это не ошибка сети, а чужой или удалённый товар.
      return (data as ProductDetail | null) ?? null
    },
  })
}

export type VariantRow = {
  id: string
  sku: string
  barcode: string | null
  name: string | null
  cost_price: number | null
  cost_currency: Enums<'currency'>
  archived_at: string | null
}

export function useVariants(tenantId: string | undefined, productId: string | undefined) {
  return useQuery({
    queryKey: ['variants', tenantId, productId],
    enabled: Boolean(tenantId && productId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_variants')
        .select('id, sku, barcode, name, cost_price, cost_currency, archived_at')
        .eq('product_id', productId!)
        .eq('tenant_id', tenantId!)
        .is('archived_at', null)
        .order('created_at')

      if (error) throw new Error(error.message)
      return (data ?? []) as VariantRow[]
    },
  })
}

export type ProductPatch = {
  name: string
  description: string
  categoryId: string
  brandId: string
}

export function useUpdateProduct(tenantId: string | undefined, productId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: ProductPatch) => {
      const { error } = await supabase
        .from('products')
        .update({
          name: p.name.trim(),
          description: p.description.trim() || null,
          category_id: p.categoryId || null,
          brand_id: p.brandId || null,
        })
        .eq('id', productId!)
        .eq('tenant_id', tenantId!)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['product'] })
      void qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

/** Мягкое удаление. Товар может фигурировать в старых заказах. */
export function useArchiveProduct(tenantId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('products')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', productId)
        .eq('tenant_id', tenantId!)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['product'] })
      void qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export type NewVariant = {
  sku: string
  barcode: string
  name: string
  costPrice: string
  currency: Enums<'currency'>
}

export function useCreateVariant(tenantId: string | undefined, productId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: NewVariant) => {
      const { error } = await supabase.from('product_variants').insert({
        tenant_id: tenantId!,
        product_id: productId!,
        sku: v.sku.trim(),
        barcode: v.barcode.trim() || null,
        name: v.name.trim() || null,
        cost_price: v.costPrice ? Number(v.costPrice) : null,
        cost_currency: v.currency,
      })
      if (error) {
        // Артикул уникален в пределах компании — частый случай,
        // стоит отдельной понятной фразы вместо текста от Postgres.
        throw new Error(error.code === UNIQUE_VIOLATION ? 'sku_taken' : error.message)
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['variants'] })
      void qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useUpdateVariant(tenantId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { id: string } & NewVariant) => {
      const { error } = await supabase
        .from('product_variants')
        .update({
          sku: v.sku.trim(),
          barcode: v.barcode.trim() || null,
          name: v.name.trim() || null,
          cost_price: v.costPrice ? Number(v.costPrice) : null,
          cost_currency: v.currency,
        })
        .eq('id', v.id)
        .eq('tenant_id', tenantId!)
      if (error) {
        throw new Error(error.code === UNIQUE_VIOLATION ? 'sku_taken' : error.message)
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['variants'] })
      void qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

/**
 * Удаление варианта. Последний вариант удалить нельзя —
 * запрет стоит триггером в базе (миграция 0014), а не проверкой здесь.
 */
export function useDeleteVariant(tenantId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('product_variants')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId!)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['variants'] })
      void qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

// ============================================================
// СПРАВОЧНИКИ
// ============================================================

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

export function useCreateCategory(tenantId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string; parentId: string }) => {
      const base = slugify(input.name)

      // Две категории с одинаковым именем дадут один slug. Подбираем
      // свободный вместо того, чтобы показывать ошибку про адрес,
      // который пользователь нигде не вводил.
      for (let i = 0; i < SLUG_ATTEMPTS; i++) {
        const slug = i === 0 ? base : `${base}-${i + 1}`
        const { error } = await supabase.from('categories').insert({
          tenant_id: tenantId!,
          name: input.name.trim(),
          slug,
          parent_id: input.parentId || null,
        })
        if (!error) return
        if (error.code !== UNIQUE_VIOLATION) throw new Error(error.message)
      }
      throw new Error('slug_exhausted')
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

export function useCreateBrand(tenantId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const base = slugify(name)
      for (let i = 0; i < SLUG_ATTEMPTS; i++) {
        const slug = i === 0 ? base : `${base}-${i + 1}`
        const { error } = await supabase.from('brands').insert({
          tenant_id: tenantId!,
          name: name.trim(),
          slug,
        })
        if (!error) return
        if (error.code !== UNIQUE_VIOLATION) throw new Error(error.message)
      }
      throw new Error('slug_exhausted')
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['brands'] })
    },
  })
}

/**
 * Удаление справочника НЕ удаляет товары: внешний ключ объявлен
 * как on delete set null по одной колонке, товар останется без категории.
 * Право на удаление есть только у owner и admin — проверяет RLS.
 */
export function useDeleteCategory(tenantId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId!)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['categories'] })
      void qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useDeleteBrand(tenantId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('brands')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId!)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['brands'] })
      void qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

// ============================================================
// СОЗДАНИЕ ТОВАРА
// ============================================================

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
      if (error) {
        throw new Error(error.code === UNIQUE_VIOLATION ? 'sku_taken' : error.message)
      }
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

/** Форматирование денег. Считает база, фронт только показывает. */
export function formatMoney(value: number | null, currency: string, locale: string): string {
  if (value === null || value === undefined) return '\u2014'
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
