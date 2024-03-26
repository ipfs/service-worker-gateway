import { type Config } from '@playwright/test'
import { $ } from 'execa'
import { kuboRepoDir } from './fixtures/load-kubo-fixtures.js'

export default async function globalTeardown (config: Config): Promise<void> {
  await $`rm -rf ${kuboRepoDir}`
}
