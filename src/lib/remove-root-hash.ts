/**
 * Error pages live on the page root but React's HashRouter makes the page hash
 * "#/" which can interfere with CTRL+R-style page reloads so remove the hash
 * without causing a page reload so we are on a bare URL.
 */
export function removeRootHashIfPresent (): void {
  if (window.location.hash === '#/') {
    // const base = document.querySelector('base');
    // base?.setAttribute('href', '');
    // remove any UI-added navigation info
    history.pushState('', document.title, window.location.pathname + window.location.search)
  }
}
