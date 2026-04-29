import { loadWithServiceWorker, type LoadWithServiceWorkerOptions } from './load-with-service-worker.ts'
import type { FrameLocator, Locator, Page, Response } from 'playwright'

/**
 * Helpers for tests written before the media-viewer wrapper (#574) shipped.
 *
 * The wrapper turns top-level navigations to renderable content
 * (image/video/audio/pdf/text/json) into an HTML viewer that embeds the
 * resource in an `<iframe>`. Existing tests asserting on either the bare
 * `Content-Type` of the document response or on body text rendered into
 * the parent page need either to bypass the wrapper or to look inside the
 * iframe.
 */

/**
 * Navigate to `resource` so the media-viewer wrapper *is* active. Use this
 * in tests that assert on the wrapper UI itself: the rendered top bar, the
 * embedded `<img>` / `<video>` / `<iframe>`, the Download button, or the
 * `globalThis.renderMedia` props. Behaves like `loadWithServiceWorker`;
 * the rename is purely for clarity at the call site.
 */
export async function loadWithMediaViewer (page: Page, resource: string, options?: LoadWithServiceWorkerOptions): Promise<Response> {
  return loadWithServiceWorker(page, resource, options)
}

/**
 * Navigate to `resource` with `?download=true` appended so the media-viewer
 * wrapper is bypassed. The SW responds with
 * `Content-Disposition: attachment`, preserving the original `Content-Type`,
 * `Cache-Control`, `Etag` and body bytes for assertion.
 * `loadWithServiceWorker` streams attachment downloads through the
 * Playwright download event, so `response.text()` and `response.body()`
 * return the resource bytes.
 */
export async function loadBypassingMediaViewer (page: Page, resource: string, options?: LoadWithServiceWorkerOptions): Promise<Response> {
  const url = new URL(resource)
  url.searchParams.set('download', 'true')
  return loadWithServiceWorker(page, url.toString(), options)
}

/**
 * Returns a `FrameLocator` for the media-viewer wrapper's iframe. Use when
 * asserting on rendered text/JSON/PDF body content in tests that navigate
 * to a renderable resource.
 */
export function mediaViewerFrame (page: Page): FrameLocator {
  return page.frameLocator('iframe')
}

/**
 * Convenience: the `<body>` of the media-viewer wrapper's iframe.
 * Equivalent to `mediaViewerFrame(page).locator('body')`.
 */
export function mediaViewerBody (page: Page): Locator {
  return mediaViewerFrame(page).locator('body')
}
