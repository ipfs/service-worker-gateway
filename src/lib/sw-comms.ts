export async function tellSwToReloadConfig (): Promise<void> {
  const resp = await fetch('/#/ipfs-sw-config-reload')
  if (!resp.ok) {
    throw new Error('Failed to reload config')
  }
}
