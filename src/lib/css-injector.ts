/**
 * Dynamically injects a CSS file into the document head
 * @param cssFilename - The filename of the CSS file to inject
 */
export function injectCSS(cssFilename: string): void {
  // Check if CSS is already injected to avoid duplicates
  const existingLink = document.querySelector(`link[href="/${cssFilename}"]`)
  if (existingLink) {
    return
  }

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `/${cssFilename}`
  link.type = 'text/css'

  document.head.appendChild(link)
}
