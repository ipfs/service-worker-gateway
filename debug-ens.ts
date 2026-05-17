/* eslint-disable no-console */
import { resolveEthDnsLink } from './src/sw/lib/ens-resolver.ts'

async function main (): Promise<void> {
  const name = process.argv[2] ?? 'vitalik.eth'

  const startedAt = Date.now()

  console.log(`[debug:ens] resolving ${name}`)

  try {
    const result = await resolveEthDnsLink(name)
    const elapsedMs = Date.now() - startedAt

    console.log('[debug:ens] success')
    console.log(`[debug:ens] dnsLinkPath=${result.dnsLinkPath}`)
    console.log(`[debug:ens] blockNumber=${result.blockNumber}`)
    console.log(`[debug:ens] blockHash=${result.blockHash}`)
    console.log(`[debug:ens] elapsedMs=${elapsedMs}`)
  } catch (err) {
    const elapsedMs = Date.now() - startedAt
    console.error('[debug:ens] failure')
    console.error(`[debug:ens] elapsedMs=${elapsedMs}`)

    if (err instanceof Error) {
      console.error(`[debug:ens] name=${err.name}`)
      console.error(`[debug:ens] message=${err.message}`)
      if (err.stack != null) {
        console.error(err.stack)
      }
    } else {
      console.error(String(err))
    }

    process.exitCode = 1
  }
}

await main()
