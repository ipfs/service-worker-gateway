import React, { useCallback, useContext, useState } from 'react'
import { ConfigContext } from '../context/config-context.tsx'
import { HeliaServiceWorkerCommsChannel } from '../lib/channel.ts'
import { loadConfigFromLocalStorage } from '../lib/config-db.ts'
import { LOCAL_STORAGE_KEYS } from '../lib/local-storage.ts'
import LocalStorageInput from './local-storage-input.tsx'

const channel = new HeliaServiceWorkerCommsChannel('WINDOW')

export default (): JSX.Element | null => {
  const { isConfigExpanded, setConfigExpanded } = useContext(ConfigContext)

  if (!isConfigExpanded) {
    return null
  }

  const [error, setError] = useState<Error | null>(null)
  const urlValidationFn = (value: string): Error | null => {
    try {
      const urls = JSON.parse(value) satisfies string[]
      let i = 0
      try {
        urls.map((url, index) => {
          i = index
          return new URL(url)
        })
      } catch (e) {
        throw new Error(`URL "${urls[i]}" at index ${i} is not valid`)
      }
      return null
    } catch (err) {
      return err as Error
    }
  }

  const saveConfig = useCallback(async () => {
    try {
      await loadConfigFromLocalStorage()
      channel.postMessage({ target: 'SW', action: 'RELOAD_CONFIG' })
      setConfigExpanded(false)
    } catch (err) {
      setError(err as Error)
    }
  }, [])

  return (
    <main className='pa4-l bg-snow mw7 mv5 center pa4'>
      <LocalStorageInput localStorageKey={LOCAL_STORAGE_KEYS.config.gateways} label='Gateways' validationFn={urlValidationFn} />
      <LocalStorageInput localStorageKey={LOCAL_STORAGE_KEYS.config.routers} label='Routers' validationFn={urlValidationFn} />
      <button id="save-config" onClick={() => { void saveConfig() }} className='button-reset pv3 tc bn bg-animate bg-black-80 hover-bg-aqua white pointer w-100'>Save Config</button>

      {error != null && <span style={{ color: 'red' }}>{error.message}</span>}
    </main>
  )
}
