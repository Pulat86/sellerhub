/**
 * Транслитерация и построение короткого адреса.
 *
 * База требует slug вида ^[a-z0-9][a-z0-9-]{0,78}[a-z0-9]$.
 * Пользователь пишет названия кириллицей, и без транслитерации
 * каждая категория упиралась бы в ограничение.
 *
 * Покрыты русская кириллица и узбекские буквы.
 */

const MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh',
  з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu',
  я: 'ya',
  ў: 'o', қ: 'q', ғ: 'g', ҳ: 'h',
}

export function slugify(input: string): string {
  const lower = input.toLowerCase().trim()
  let out = ''

  for (const ch of lower) {
    const mapped = MAP[ch]
    if (mapped !== undefined) out += mapped
    else if (/[a-z0-9]/.test(ch)) out += ch
    else out += '-'
  }

  out = out.replace(/-+/g, '-').replace(/^-+|-+$/g, '')

  // Имя из символов, которые не переводятся. Пустой slug
  // не пройдёт ограничение базы, поэтому даём запасной вариант.
  if (out.length < 2) return 'item'

  return out.slice(0, 78)
}
