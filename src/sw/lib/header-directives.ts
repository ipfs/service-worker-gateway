export type HeaderDirectives = Record<string, string | boolean>

export function parseHeaderDirectives (header?: string | null): HeaderDirectives {
  const directives: HeaderDirectives = {}

  header?.split(',').forEach(val => {
    val = val.trim()

    if (val.includes('=')) {
      const [key, value] = val.split('=').map(v => v.trim())
      directives[key] = value
      return
    }

    directives[val] = true
  })

  return directives
}
