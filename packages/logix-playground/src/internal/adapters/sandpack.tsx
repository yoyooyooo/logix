import React from 'react'
import {
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
  type SandpackFiles,
} from '@codesandbox/sandpack-react'
import type { ProjectSnapshot } from '../snapshot/projectSnapshot.js'
import { createPreviewSession, type PreviewSession } from '../session/previewSession.js'

export interface SandpackPreviewAdapterProps {
  readonly snapshot: ProjectSnapshot
  readonly resetCount: number
}

declare global {
  interface Window {
    __LOGIX_PLAYGROUND_PREVIEW_TEST_MODE__?: boolean
  }
}

const toSandpackPath = (path: string): string => (path.startsWith('/') ? path : `/${path}`)

const makePreviewMainSource = (snapshot: ProjectSnapshot): string => {
  const entry = snapshot.previewEntry?.entry ?? '/src/App.tsx'
  return [
    'import React from "react"',
    'import { createRoot } from "react-dom/client"',
    `import * as PreviewEntry from ${JSON.stringify(entry)}`,
    '',
    'const RootComponent = PreviewEntry.App ?? PreviewEntry.default',
    'const rootElement = document.getElementById("root")',
    'if (!rootElement) throw new Error("Missing #root element")',
    'if (!RootComponent) throw new Error("Preview entry must export App or default")',
    'createRoot(rootElement).render(<RootComponent />)',
    '',
  ].join('\n')
}

export const snapshotToSandpackFiles = (snapshot: ProjectSnapshot): SandpackFiles => {
  const files: SandpackFiles = snapshot.previewEntry
    ? { '/index.html': '<div id="root"></div>' }
    : {}

  for (const file of snapshot.files.values()) {
    files[toSandpackPath(file.path)] = {
      code: file.content,
      readOnly: !file.editable,
      active: file.path === snapshot.previewEntry?.entry,
    }
  }

  if (snapshot.previewEntry && !snapshot.files.has('/src/main.tsx')) {
    files['/src/main.tsx'] = {
      code: makePreviewMainSource(snapshot),
      hidden: true,
    }
  }

  return files
}

const extractCounterStep = (snapshot: ProjectSnapshot): number => {
  const logic = snapshot.files.get('/src/logic/localCounter.logic.ts')?.content ?? ''
  const match = logic.match(/counterStep\s*=\s*(-?\d+)/)
  const step = match ? Number(match[1]) : 1
  return Number.isFinite(step) ? step : 1
}

function DeterministicPreviewHost({ snapshot, session }: {
  readonly snapshot: ProjectSnapshot
  readonly session: PreviewSession
}): React.ReactElement {
  const step = extractCounterStep(snapshot)
  const [count, setCount] = React.useState(0)

  React.useEffect(() => {
    setCount(0)
  }, [session.sessionId])

  if (!snapshot.previewEntry) {
    return <p>Preview unavailable</p>
  }

  return (
    <div
      data-logix-deterministic-preview-host="true"
      data-logix-preview-session-id={session.sessionId}
      className="space-y-3 p-6"
    >
      <p className="text-sm font-medium">Preview count: {count}</p>
      <p className="text-sm text-muted-foreground">Preview step: {step}</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setCount((value) => value - step)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
        >
          Decrement preview
        </button>
        <button
          type="button"
          onClick={() => setCount((value) => value + step)}
          className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background transition-opacity hover:opacity-85"
        >
          Increment preview
        </button>
      </div>
    </div>
  )
}

export function SandpackPreviewAdapter({
  snapshot,
  resetCount,
}: SandpackPreviewAdapterProps): React.ReactElement {
  const session = React.useMemo(
    () => createPreviewSession(snapshot, { resetCount, status: snapshot.previewEntry ? 'ready' : 'idle' }),
    [resetCount, snapshot],
  )
  const files = React.useMemo(() => snapshotToSandpackFiles(snapshot), [snapshot])
  const previewHostKey = `${snapshot.projectId}:preview:reset${resetCount}`
  const testMode = typeof window !== 'undefined' && window.__LOGIX_PLAYGROUND_PREVIEW_TEST_MODE__ === true

  if (!snapshot.previewEntry || testMode) {
    return (
      <div data-logix-preview-root="true" data-logix-preview-session-id={session.sessionId}>
        <DeterministicPreviewHost snapshot={snapshot} session={session} />
      </div>
    )
  }

  return (
    <div data-logix-preview-root="true" data-logix-preview-session-id={session.sessionId}>
      <SandpackProvider
        key={previewHostKey}
        template="react-ts"
        files={files}
        customSetup={{
          dependencies: {
            '@logixjs/core': 'latest',
            '@logixjs/react': 'latest',
            effect: '4.0.0-beta.28',
            react: '19.2.0',
            'react-dom': '19.2.0',
          },
        }}
        options={{
          activeFile: snapshot.previewEntry.entry,
          autorun: true,
          autoReload: true,
          recompileMode: 'immediate',
        }}
      >
        <SandpackLayout>
          <SandpackPreview
            showNavigator={false}
            showOpenInCodeSandbox={false}
            showOpenNewtab={false}
            showRefreshButton={false}
            showRestartButton={false}
            showSandpackErrorOverlay={true}
          />
        </SandpackLayout>
      </SandpackProvider>
    </div>
  )
}
