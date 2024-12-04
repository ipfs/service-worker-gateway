import type { FrameLocator, Locator, Page } from '@playwright/test'

export interface GetLocator {
  (page: Page | FrameLocator): Locator
}
export interface GetFrameLocator {
  (page: Page | FrameLocator): FrameLocator
}

/**
 * Page parts
 */
export const getHeader: GetLocator = (page) => page.locator('.e2e-header')
export const getHeaderTitle: GetLocator = (page) => page.locator('.e2e-header-title')
export const getConfigPage: GetLocator = (page) => page.locator('.e2e-config-page')
export const getConfigPageInput: GetLocator = (page) => page.locator('.e2e-config-page-input')
export const getConfigPageSaveButton: GetLocator = (page) => page.locator('.e2e-config-page-button#save-config')
export const getIframeLocator: GetFrameLocator = (page) => page.frameLocator('iframe')
export const getConfigGatewaysInput: GetLocator = (page) => page.locator('.e2e-config-page-input-gateways')
export const getConfigRoutersInput: GetLocator = (page) => page.locator('.e2e-config-page-input-routers')
export const getConfigAutoReloadInput: GetLocator = (page) => page.locator('.e2e-config-page-input-autoreload')

export const getNoServiceWorkerError: GetLocator = (page) => page.locator('.e2e-no-service-worker-error')

export const getHelperUi: GetLocator = (page) => page.locator('.e2e-helper-ui')
export const getAboutSection: GetLocator = (page) => page.locator('.e2e-about-section')

/**
 * Iframe page parts
 */
export const getConfigButtonIframe: GetLocator = (page) => getIframeLocator(page).locator('.e2e-collapsible-button')
export const getConfigGatewaysInputIframe: GetLocator = (page) => getConfigGatewaysInput(getIframeLocator(page))
export const getConfigRoutersInputIframe: GetLocator = (page) => getConfigRoutersInput(getIframeLocator(page))
export const getConfigAutoReloadInputIframe: GetLocator = (page) => getConfigAutoReloadInput(getIframeLocator(page))
export const getConfigPageSaveButtonIframe: GetLocator = (page) => getConfigPageSaveButton(getIframeLocator(page))
