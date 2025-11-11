import React, { createContext, useState } from 'react'
import { Config } from '../../lib/config-db.js'
import type { ConfigDb, ConfigDbWithoutPrivateFields } from '../../lib/config-db.js'
import type { PropsWithChildren } from 'react'

export interface ConfigContextType {
  saveConfig(db: Partial<ConfigDbWithoutPrivateFields>): Promise<void>
  resetConfig(): Promise<void>
  config: Config
  configDb: ConfigDb
}

export const ConfigContext = createContext<ConfigContextType>({
  resetConfig: async () => Promise.resolve(),
  saveConfig: async (db: Partial<ConfigDbWithoutPrivateFields>) => Promise.resolve(),
  // @ts-expect-error incomplete implementation
  config: {},
  isLoading: true
})

export interface ConfigProviderProps extends PropsWithChildren {
  config: Config
  configDb: ConfigDb
}

export const ConfigProvider: React.FC<ConfigProviderProps> = ({ config, configDb: configDbInit, children }) => {
  const [configDb, setConfigDb] = useState(configDbInit)

  const resetConfigLocal: ConfigContextType['resetConfig'] = async (): Promise<void> => {
    await config.reset()
    setConfigDb(await config.get())
  }

  const saveConfigLocal: ConfigContextType['saveConfig'] = async (db: Partial<ConfigDbWithoutPrivateFields>): Promise<void> => {
    await config.set(db)
    setConfigDb(await config.get())
  }

  const finalConfigContext: ConfigContextType = {
    resetConfig: resetConfigLocal,
    saveConfig: saveConfigLocal,
    config,
    configDb
  }

  return (
    <ConfigContext.Provider value={finalConfigContext}>
      {children}
    </ConfigContext.Provider>
  )
}
