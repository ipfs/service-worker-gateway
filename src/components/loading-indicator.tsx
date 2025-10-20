import React, { useEffect } from 'react'

const loadingIndicatorElement = document.querySelector('.loading-indicator-js')
const LoadingIndicator: React.FC = (): null => {
  useEffect(() => {
    loadingIndicatorElement?.classList.remove('hidden')
    return () => {
      loadingIndicatorElement?.classList.add('hidden')
    }
  }, [])

  return null
}

export default LoadingIndicator
