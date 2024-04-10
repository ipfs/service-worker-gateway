import React, { createContext, useState } from 'preact/compat'
import { isConfigPage } from '../lib/is-config-page.js'

const isLoadedInIframe = window.self !== window.top

export const ConfigContext = createContext({
  isConfigExpanded: isLoadedInIframe,
  setConfigExpanded: (value: boolean) => {}
})

export const ConfigProvider = ({ children }: { children: JSX.Element[] | JSX.Element, expanded?: boolean }): JSX.Element => {
  const [isConfigExpanded, setConfigExpanded] = useState(isConfigPage(window.location.hash))
  const isExplicitlyLoadedConfigPage = isConfigPage(window.location.hash)

  const setConfigExpandedWrapped = (value: boolean): void => {
    if (isLoadedInIframe || isExplicitlyLoadedConfigPage) {
      // ignore it
    } else {
      setConfigExpanded(value)
    }
  }

  return (
    <ConfigContext.Provider value={{ isConfigExpanded, setConfigExpanded: setConfigExpandedWrapped }}>
      {children}
    </ConfigContext.Provider>
  )
}
