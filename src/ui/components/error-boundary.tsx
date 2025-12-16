import * as React from 'react'
import { RuntimeErrorPage } from '../pages/runtime-error.tsx'

interface ErrorBoundaryState {
  error?: Error
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  constructor (props: any) {
    super(props)

    this.state = {
      error: undefined
    }
  }

  static getDerivedStateFromError (error: Error): ErrorBoundaryState {
    return {
      error
    }
  }

  render (): React.ReactNode {
    if (this.state.error != null) {
      // You can render any custom fallback UI
      return (
        <RuntimeErrorPage error={this.state.error} />
      )
    }

    return this.props.children
  }
}
