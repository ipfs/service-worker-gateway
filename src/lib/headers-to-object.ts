export function headersToObject (headers: Headers): Record<string, string> {
  const output: Record<string, string> = {}

  for (const [key, value] of headers.entries()) {
    output[key] = value
  }

  return output
}
