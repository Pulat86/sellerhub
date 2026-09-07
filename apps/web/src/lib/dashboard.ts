import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { DashboardSummary } from '../types/database.wms'

/**
 * Сводка дашборда одним запросом.
 *
 * Шесть отдельных запросов означали бы шесть задержек сети на первом же
 * экране, который видит человек после входа.
 */
export function useDashboard(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['dashboard', tenantId],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('dashboard_summary', {
        p_tenant: tenantId!,
      })
      if (error) throw new Error(error.message)
      return data as unknown as DashboardSummary
    },
  })
}

/** Деньги считает база. Здесь только показ. */
export function formatMoney(value: number, locale: string, currency = 'UZS'): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `${value} ${currency}`
  }
}

export function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(value)
}
