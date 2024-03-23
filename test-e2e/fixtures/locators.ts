import type { Locator, Page } from '@playwright/test'

export interface GetLocator {
  (page: Page): Locator
}

export const getHeader: GetLocator = (page) => page.locator('.e2e-header')
export const getHeaderTitle: GetLocator = (page) => page.locator('.e2e-header-title')
export const getConfigButton: GetLocator = (page) => page.locator('.e2e-header-config-button')
export const getConfigPage: GetLocator = (page) => page.locator('.e2e-config-page')
export const getConfigPageInput: GetLocator = (page) => page.locator('.e2e-config-page-input')
export const getConfigPageButton: GetLocator = (page) => page.locator('.e2e-config-page-button')
export const getConfigAutoReloadInput: GetLocator = (page) => page.locator('.e2e-config-page-input-autoreload')
