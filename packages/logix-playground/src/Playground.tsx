import React from 'react'
import * as Logix from '@logixjs/core'
import { RuntimeProvider } from '@logixjs/react'
import type { PlaygroundRegistry } from './Project.js'
import { PlaygroundShell } from './internal/components/PlaygroundShell.js'
import { resolveNormalizedPlaygroundProject } from './internal/project/registry.js'
import { createPlaygroundWorkspace } from './internal/session/workspace.js'
import { PlaygroundWorkbenchProgram } from './internal/state/workbenchProgram.js'

export interface PlaygroundPageProps {
  readonly registry: PlaygroundRegistry
  readonly projectId: string
  readonly projectSwitcher?: React.ReactNode
  readonly backHref?: string
  readonly backLabel?: string
}

const playgroundWorkbenchRuntime = Logix.Runtime.make(PlaygroundWorkbenchProgram, {
  label: 'LogixPlaygroundWorkbenchRuntime',
})

export function PlaygroundPage({
  registry,
  projectId,
  projectSwitcher,
  backHref,
  backLabel = 'Back',
}: PlaygroundPageProps): React.ReactElement {
  const project = React.useMemo(
    () => resolveNormalizedPlaygroundProject(registry, projectId),
    [projectId, registry],
  )
  const workspace = React.useMemo(
    () => (project ? createPlaygroundWorkspace(project) : undefined),
    [project],
  )

  if (!project) {
    return (
      <main
        data-logix-playground-page="true"
        className="min-h-dvh bg-background px-6 py-8 text-foreground"
      >
        <div className="mx-auto max-w-3xl rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight">Playground project not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">{projectId}</p>
        </div>
      </main>
    )
  }

  if (!workspace) {
    return (
      <main
        data-logix-playground-page="true"
        className="min-h-dvh bg-background px-6 py-8 text-foreground"
      >
        <div className="mx-auto max-w-3xl rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight">Playground project unavailable</h1>
        </div>
      </main>
    )
  }

  return (
    <main
      data-logix-playground-page="true"
      data-testid="playground-visual-shell"
      className="h-dvh overflow-hidden bg-white font-sans text-sm text-gray-800"
      style={{ contain: 'layout paint size' }}
    >
      <RuntimeProvider runtime={playgroundWorkbenchRuntime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        <PlaygroundShell
          workspace={workspace}
          projectSwitcher={projectSwitcher}
          backHref={backHref}
          backLabel={backLabel}
        />
      </RuntimeProvider>
    </main>
  )
}
