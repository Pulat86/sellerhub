import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  throw new Error(
    'Не заданы VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY. Скопируй .env.example в .env.',
  )
}

/**
 * Клиент ходит в базу напрямую с публичным ключом.
 * Единственное, что не даёт прочитать чужие данные, — RLS.
 * Поэтому таблица без политики = утечка, а не «доделаем потом».
 */
export const supabase = createClient<Database>(url, key)
