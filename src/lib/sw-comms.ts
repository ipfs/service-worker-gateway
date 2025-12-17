import { QUERY_PARAMS } from './constants.js'

export async function tellSwToReloadConfig (): Promise<void> {
  const resp = await fetch(`?${QUERY_PARAMS.RELOAD_CONFIG}=true`)
  if (!resp.ok) {
    throw new Error('Failed to reload config')
  }
}
