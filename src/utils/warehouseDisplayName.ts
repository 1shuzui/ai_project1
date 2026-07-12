/** 库房展示名 */
export function warehouseDisplayName(name: string | null | undefined): string {
  const s = String(name ?? '').trim()
  if (!s) return ''
  return s
}
