import React, { useContext, useMemo } from 'react'
import { ServiceWorkerContext } from '../context/service-worker-context.jsx'
type ButtonProps = React.JSX.IntrinsicElements['button']

interface ServiceWorkerReadyButtonProps extends ButtonProps {
  label: string
  waitingLabel?: string
}

export const ServiceWorkerReadyButton: React.FC<ServiceWorkerReadyButtonProps> = ({ className, label, waitingLabel, ...props }) => {
  const { isServiceWorkerRegistered } = useContext(ServiceWorkerContext)

  const buttonClasses = new Set(['button-reset', 'pv3', 'tc', 'bn', 'cursor-disabled', 'bg-gray'])
  if (isServiceWorkerRegistered) {
    buttonClasses.delete('bg-gray')
    buttonClasses.delete('cursor-disabled')
    buttonClasses.add('pointer')
  }

  const lbl = useMemo(() => {
    if (!isServiceWorkerRegistered) {
      return waitingLabel ?? label
    }
    return label
  }, [isServiceWorkerRegistered, waitingLabel, label])

  return (
    <button
      disabled={!isServiceWorkerRegistered}
      className={`${Array.from(buttonClasses).join(' ')} ${className}`}
      {...props}
    >
      {lbl}
    </button>
  )
}
