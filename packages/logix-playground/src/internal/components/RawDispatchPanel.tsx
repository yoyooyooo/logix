import React from 'react'
import type { ActionPanelViewModel } from '../action/actionManifest.js'
import { parseActionPayloadInput } from '../action/payloadInput.js'
import { MonacoSourceEditor } from '../editor/MonacoSourceEditor.js'

export interface RawDispatchPanelProps {
  readonly manifest: ActionPanelViewModel
  readonly disabled?: boolean
  readonly onDispatch: (action: { readonly _tag: string; readonly payload?: unknown }) => void
  readonly expanded: boolean
  readonly onExpandedChange: (expanded: boolean) => void
}

const normalizeRawAction = (
  value: unknown,
): { readonly success: true; readonly action: { readonly _tag: string; readonly payload?: unknown } } | {
  readonly success: false
  readonly message: string
} => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { success: false, message: 'Raw action must be a JSON object.' }
  }
  const record = value as Record<string, unknown>
  if (typeof record._tag !== 'string' || record._tag.length === 0) {
    return { success: false, message: 'Raw action requires string _tag.' }
  }

  return {
    success: true,
    action: {
      _tag: record._tag,
      payload: 'payload' in record ? record.payload : undefined,
    },
  }
}

export function RawDispatchPanel({
  manifest,
  disabled = false,
  onDispatch,
  expanded,
  onExpandedChange,
}: RawDispatchPanelProps): React.ReactElement {
  const [input, setInput] = React.useState('{ "_tag": "increment" }')
  const [error, setError] = React.useState<string | undefined>(undefined)
  const knownTags = React.useMemo(() => new Set(manifest.actions.map((action) => action.actionTag)), [manifest.actions])

  const dispatchRaw = React.useCallback(() => {
    const parsed = parseActionPayloadInput(input)
    if (!parsed.success) {
      setError(parsed.message)
      return
    }
    const normalized = normalizeRawAction(parsed.value)
    if (!normalized.success) {
      setError(normalized.message)
      return
    }
    if (!knownTags.has(normalized.action._tag)) {
      setError(`Unknown action ${normalized.action._tag}.`)
      return
    }

    setError(undefined)
    onDispatch(normalized.action)
  }, [input, knownTags, onDispatch])

  return (
    <section aria-label="Advanced actions" className="rounded-lg border border-border bg-card text-card-foreground shadow-sm">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => onExpandedChange(!expanded)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        Advanced
        <span>{expanded ? 'Hide' : 'Show'}</span>
      </button>
      {expanded ? (
        <div role="region" aria-label="Raw dispatch" className="space-y-2 border-t border-border p-3">
          <MonacoSourceEditor
            path="/src/fixtures/raw-action.fixture.ts"
            language="json"
            ariaLabel="Raw action JSON"
            value={input}
            onChange={(value) => {
              setInput(value)
              setError(undefined)
            }}
            className="h-24 w-full overflow-hidden rounded-md border border-border bg-background"
          />
          {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
          <button
            type="button"
            disabled={disabled}
            onClick={dispatchRaw}
            className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
          >
            Dispatch raw action
          </button>
        </div>
      ) : null}
    </section>
  )
}
