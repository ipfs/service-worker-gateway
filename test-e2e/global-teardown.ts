import { $ } from 'execa'
import { kuboRepoDir } from './fixtures/load-kubo-fixtures.ts'

export default async function globalTeardown (config: Record<string, any>): Promise<void> {
  const kuboPid = process.env.KUBO_PID

  if (kuboPid != null) {
    try {
      await $`kill -9 ${kuboPid}`
    } catch {
      // ignore
    }
  }

  await $`rm -rf ${kuboRepoDir}`

  // stop the API/DNS server
  config.userData?.apiServer?.close?.()
  config.userData?.apiServer?.closeAllConnections?.()
}
