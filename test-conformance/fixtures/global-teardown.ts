import { $ } from 'execa'
import type { Config } from '@playwright/test'

export default async function globalTeardown (config: Config): Promise<void> {
  const kuboPid = process.env.KUBO_PID
  const kuboRepoDir = process.env.KUBO_REPO_DIR

  if (kuboPid != null) {
    try {
      await $`kill -9 ${kuboPid}`
    } catch {
      // ignore
    }
  }

  if (kuboRepoDir != null) {
    await $`rm -rf ${kuboRepoDir}`
  }
}
