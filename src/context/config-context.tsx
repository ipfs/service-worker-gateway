import React from 'react'

const isLoadedInIframe = window.self !== window.top

export const ConfigContext = React.createContext({
  isConfigExpanded: isLoadedInIframe,
  setConfigExpanded: (value: boolean) => {}
})

export const ConfigProvider = ({ children, expanded = isLoadedInIframe }: { children: JSX.Element[] | JSX.Element, expanded?: boolean }): JSX.Element => {
  const [isConfigExpanded, setConfigExpanded] = React.useState(expanded)
  const isExplicitlyLoadedConfigPage = window.location.pathname === '/config'

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
