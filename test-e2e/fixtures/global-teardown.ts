import { $ } from 'execa'
import { kuboRepoDir } from './load-kubo-fixtures.ts'
import type { Servers } from './serve/index.ts'

interface Config extends Record<string, any> {
  userData?: Servers
}

export default async function globalTeardown (config: Config): Promise<void> {
  await config.userData?.stop?.()
  await $`rm -rf ${kuboRepoDir}`
}
