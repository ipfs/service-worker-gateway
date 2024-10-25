import { useEffect, useState } from 'react'
import { hasLocalGateway } from '../lib/local-gateway.js'
import type { ComponentLogger } from '@libp2p/logger'

export interface UseLocalGatewayProps {
  logger: ComponentLogger
}
export interface UseLocalGatewayReturn {
  available: boolean
  checked: boolean
}

export function useLocalGateway ({ logger }: UseLocalGatewayProps): UseLocalGatewayReturn {
  const log = logger.forComponent('use-local-gateway')
  const [localGatewayAvailable, setLocalGatewayAvailable] = useState<boolean | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        if (await hasLocalGateway()) {
          setLocalGatewayAvailable(true)
        } else {
          setLocalGatewayAvailable(false)
        }
      } catch (e) {
        log.error('failed to probe for local gateway', e)
        setLocalGatewayAvailable(false)
      }
    })()
  }, [])

  return {
    available: localGatewayAvailable === true,
    checked: localGatewayAvailable !== null
  }
}
