import React from 'react'

export interface PlaygroundErrorBoundaryProps {
  readonly children: React.ReactNode
}

interface PlaygroundErrorBoundaryState {
  readonly error: Error | null
}

export class PlaygroundErrorBoundary extends React.Component<
  PlaygroundErrorBoundaryProps,
  PlaygroundErrorBoundaryState
> {
  state: PlaygroundErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): PlaygroundErrorBoundaryState {
    return { error }
  }

  render(): React.ReactNode {
    if (this.state.error) {
      return (
        <section aria-label="Playground error" className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          <h2 className="text-sm font-semibold">Playground error</h2>
          <pre className="mt-2 whitespace-pre-wrap text-xs">{this.state.error.message}</pre>
        </section>
      )
    }
    return this.props.children
  }
}
