/**
 * Turns a record of key/value pairs into a URL-safe search params string
 *
 * We cannot use the native URLSearchParams to encode as it uses
 * `application/x-www-form-urlencoded` encoding which encodes " " as "+" and
 * not "%20" so use encodeURIComponent instead
 */
export function formatSearch (params: Record<string, string | string[]>): string {
  const search = [...Object.entries(params)]
    .map(([key, value]) => {
      if (!Array.isArray(value)) {
        value = [value]
      }

      return value
        .map(val => `${encodeURIComponent(key)}=${encodeURIComponent(val)}`)
        .join('&')
    })
    .join('&')

  if (search === '') {
    return search
  }

  return `?${search}`
}

export function parseQuery (url: URL): Record<string, string> {
  const output: Record<string, string> = {}

  for (const [key, value] of url.searchParams) {
    output[key] = value
  }

  return output
}

export interface CreateSearchOptions {
  params?: Record<string, string>
  filter?(key: string, value: string): boolean
}

/**
 * Create a search param string from the passed URLSearchParams object.
 *
 * Extra key/value pairs can be added or omitted by passing options.
 */
export function createSearch (searchParams: URLSearchParams, options?: CreateSearchOptions): string {
  const params: Record<string, string> = {}

  for (const [key, value] of searchParams) {
    if (options?.filter?.(key, value) === false) {
      continue
    }

    params[key] = value
  }

  // set passed params
  if (options?.params != null) {
    for (const [key, value] of Object.entries(options?.params)) {
      params[key] = value
    }
  }

  return formatSearch(params)
}
