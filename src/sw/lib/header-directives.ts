export type HeaderDirectives = Record<string, string | boolean>

export function parseHeaderDirectives (header?: string | null): HeaderDirectives {
  const directives: HeaderDirectives = {}

  header?.split(',').forEach(val => {
    val = val.trim()

    // directive names are case-insensitive (RFC 9110), so normalise the key;
    // values may be case-sensitive so leave them as-is
    if (val.includes('=')) {
      const [key, value] = val.split('=').map(v => v.trim())
      directives[key.toLowerCase()] = value
      return
    }

    directives[val.toLowerCase()] = true
  })

  return directives
}
