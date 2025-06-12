/**
 * Ignores wildcard types and q values, but will match exact types and wildcard subtypes.
 *
 * Needed for Safari
 */
export function acceptMatchesContentType (acceptHeader: string | null, contentType: string | null): boolean {
  if (!acceptHeader || !contentType) { return false }

  const [type = '', subtype = ''] = contentType.split('/')
  if (!type || !subtype) { return false }

  const accepted = acceptHeader
    .split(';')[0] // strip q values
    .split(',')
    .map(s => s.trim())

  const mediaTypeVariants = [
    `${type}/${subtype}`, // exact
    `${type}/*` // wildcard subtype only
  ]

  return mediaTypeVariants.some(mediaType => accepted.includes(mediaType))
}
