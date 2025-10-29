import { $ } from 'execa'
import { kuboRepoDir } from './fixtures/load-kubo-fixtures.js'
import type { Config } from '@playwright/test'

export default async function globalTeardown (config: Config): Promise<void> {
  const kuboPid = process.env.KUBO_PID

  if (kuboPid != null) {
    try {
      await $`kill -9 ${kuboPid}`
    } catch {
      // ignore
    }
  }

  await $`rm -rf ${kuboRepoDir}`
}
