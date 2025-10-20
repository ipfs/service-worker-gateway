export const convertUrlArrayToInput = (urls: string[]): string => {
  return urls.join('\n')
}

export const convertUrlInputToArray = (newlineDelimitedString: string): string[] => {
  return newlineDelimitedString.length > 0 ? newlineDelimitedString.split('\n').map((u) => u.trim()) : []
}

export const convertDnsResolverObjectToInput = (dnsResolvers: Record<string, string>): string => {
  return Object.entries(dnsResolvers).map(([key, url]) => `${key} ${url}`).join('\n')
}

export const convertDnsResolverInputToObject = (dnsResolverInput: string): Record<string, string> => {
  return dnsResolverInput.split('\n').map((u) => u.trim().split(' ')).reduce<Record<string, string>>((acc, [key, url]) => {
    acc[key] = url
    return acc
  }, {})
}
