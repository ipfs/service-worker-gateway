import React from 'react'

export const ConfigContext = React.createContext({
  isConfigExpanded: false,
  setConfigExpanded: (value: boolean) => {}
})

export const ConfigProvider = ({ children }): JSX.Element => {
  const [isConfigExpanded, setConfigExpanded] = React.useState(false)

  return (
    <ConfigContext.Provider value={{ isConfigExpanded, setConfigExpanded }}>
      {children}
    </ConfigContext.Provider>
  )
}
