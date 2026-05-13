import React from 'react'
import type { ActionPanelViewModel } from '../action/actionManifest.js'
import { parseActionPayloadInput } from '../action/payloadInput.js'
import { MonacoSourceEditor } from '../editor/MonacoSourceEditor.js'
import { ChevronDownIcon, PackageIcon, PlayIcon, RotateCcwIcon, SearchIcon } from './icons.js'

export interface ActionManifestPanelProps {
  readonly manifest: ActionPanelViewModel
  readonly disabled?: boolean
  readonly onDispatch?: (action: { readonly _tag: string; readonly payload?: unknown }) => void
  readonly editorPreferMonaco?: boolean
  readonly dense?: boolean
}

export function ActionManifestPanel({
  manifest,
  disabled = false,
  onDispatch,
  editorPreferMonaco,
  dense = false,
}: ActionManifestPanelProps): React.ReactElement {
  const [payloadInputs, setPayloadInputs] = React.useState<Record<string, string>>({})
  const [payloadErrors, setPayloadErrors] = React.useState<Record<string, string | undefined>>({})
  const [query, setQuery] = React.useState('')
  const [filter, setFilter] = React.useState<'all' | 'mutation' | 'query' | 'integration' | 'utility'>('all')

  const filteredActions = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return manifest.actions.filter((action) => {
      if (filter === 'mutation' && action.payloadKind === 'void') return false
      if (filter === 'query' && action.payloadKind !== 'void') return false
      if (filter === 'integration' || filter === 'utility') return normalizedQuery.length === 0 ? true : action.actionTag.toLowerCase().includes(normalizedQuery)
      if (!normalizedQuery) return true
      return action.actionTag.toLowerCase().includes(normalizedQuery)
    })
  }, [filter, manifest.actions, query])

  const dispatchAction = React.useCallback((action: ActionPanelViewModel['actions'][number]) => {
    if (action.payloadKind === 'void') {
      setPayloadErrors((current) => ({ ...current, [action.actionTag]: undefined }))
      onDispatch?.({ _tag: action.actionTag, payload: undefined })
      return
    }

    const parsed = parseActionPayloadInput(payloadInputs[action.actionTag] ?? '')
    if (!parsed.success) {
      setPayloadErrors((current) => ({ ...current, [action.actionTag]: parsed.message }))
      return
    }

    setPayloadErrors((current) => ({ ...current, [action.actionTag]: undefined }))
    onDispatch?.({ _tag: action.actionTag, payload: parsed.value })
  }, [onDispatch, payloadInputs])

  return (
    <section aria-label="Actions" className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-gray-200 bg-white text-gray-800 shadow-sm">
      <div className="shrink-0 border-b border-gray-100 bg-white px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="min-w-0 truncate text-xs font-medium text-gray-900">Actions</h2>
          <div className="flex shrink-0 items-center gap-2">
            <span className="sr-only">{manifest.authorityStatus}</span>
            {manifest.manifestDigest ? (
              <span className="sr-only">
                {manifest.manifestDigest}
              </span>
            ) : null}
            <span className="rounded border border-gray-200 px-2 py-0.5 text-[11px] text-gray-500">
              {manifest.actions.length} actions
            </span>
          </div>
        </div>
          <div className="mt-3 space-y-3">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1.5 h-4 w-4 text-gray-400" />
            <input
              aria-label="Search actions"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="search actions"
                className="h-8 w-full rounded-md border border-gray-200 bg-white py-1.5 pl-9 pr-20 text-xs outline-none transition-all focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            />
              <div className="absolute right-2 top-1.5 rounded border border-gray-200 bg-gray-100 px-1.5 text-[10px] text-gray-500">
                {filteredActions.length} actions
              </div>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[11px]">
              {(['all', 'mutation', 'query', 'integration', 'utility'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={filter === item}
                  onClick={() => setFilter(item)}
                  className={[
                    'shrink-0 rounded-full px-3 py-1 font-medium transition-colors',
                    filter === item
                      ? 'bg-blue-100 text-blue-700'
                      : item === 'mutation'
                        ? 'bg-green-50 text-green-700 hover:bg-green-100'
                        : item === 'query'
                          ? 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                          : item === 'integration'
                            ? 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                  ].join(' ')}
                >
                  {item === 'all'
                    ? 'All'
                    : item === 'mutation'
                      ? 'Mutation'
                      : item === 'query'
                        ? 'Query'
                        : item === 'integration'
                          ? 'Integration'
                          : 'Utility'}
                </button>
              ))}
            </div>
          </div>
      </div>
      <div data-playground-section="actions-list" className="min-h-0 flex-1 overflow-auto" style={{ overflowY: 'auto' }}>
        {manifest.evidenceGaps.length > 0 ? (
          <div className="sr-only">
            {manifest.evidenceGaps.map((gap) => (
              <p key={`${gap.kind}:${gap.source}`}>
                <span className="font-medium text-gray-800">{gap.kind}</span>
                {' '}
                <span>{gap.source}</span>
                {' '}
                <span>{gap.message}</span>
              </p>
            ))}
          </div>
        ) : null}
        {manifest.authorityStatus === 'unavailable' ? (
          <div role="status" className="p-3 text-sm text-gray-500">
            Runtime reflection manifest unavailable.
          </div>
        ) : filteredActions.length === 0 ? (
          <p className="p-3 text-sm text-gray-500">No reflected actions.</p>
        ) : (
          filteredActions.map((action) => (
            <div
              key={action.actionTag}
              className="border-b border-gray-50 bg-white px-3 py-2 hover:bg-gray-50"
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <PackageIcon className="h-4 w-4 shrink-0 text-gray-400" />
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs text-gray-700">{action.actionTag}</p>
                    <p className="sr-only">{action.authority}</p>
                  </div>
                </div>
                <span className={[
                  'rounded border px-1.5 py-0.5 text-[10px]',
                  action.payloadKind === 'void'
                    ? 'border-gray-200 bg-gray-100 text-gray-500'
                    : 'border-green-200 bg-green-50 text-green-600',
                ].join(' ')}>
                  {action.payloadKind === 'void' ? 'void' : 'payload'}
                  {action.payloadSummary ? <span className="sr-only"> {action.payloadSummary}</span> : null}
                </span>
                <button
                  type="button"
                  disabled={disabled || !onDispatch}
                  aria-label={`Dispatch ${action.actionTag}`}
                  onClick={() => dispatchAction(action)}
                  className="flex items-center gap-1 rounded border border-transparent px-2 py-1 text-[10px] font-medium text-blue-600 transition-colors hover:border-blue-100 hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-gray-400"
                  title={disabled || !onDispatch ? 'Start a fresh Program session before dispatch' : undefined}
                >
                  <PlayIcon className="h-3 w-3" />
                  Run
                </button>
              </div>
              {action.payloadKind === 'void' ? null : (
                <div className="mt-2 space-y-1">
                  <MonacoSourceEditor
                    ariaLabel={`Payload for ${action.actionTag}`}
                    path={`/src/fixtures/payload-${action.actionTag}.fixture.ts`}
                    language="json"
                    value={payloadInputs[action.actionTag] ?? ''}
                    onChange={(value) => {
                      setPayloadInputs((current) => ({ ...current, [action.actionTag]: value }))
                      setPayloadErrors((current) => ({ ...current, [action.actionTag]: undefined }))
                    }}
                    preferMonaco={editorPreferMonaco}
                    className="h-16 w-full overflow-hidden rounded-md border border-gray-200 bg-white"
                  />
                  {payloadErrors[action.actionTag] ? (
                    <p role="alert" className="text-xs text-red-600">{payloadErrors[action.actionTag]}</p>
                  ) : null}
                </div>
              )}
            </div>
          ))
        )}
      </div>
      <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 bg-gray-50 p-3">
        <button
          type="button"
          onClick={() => {
            setQuery('')
            setFilter('all')
            setPayloadErrors({})
          }}
          className="flex items-center rounded border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 shadow-sm hover:bg-gray-50"
        >
          <RotateCcwIcon className="mr-1.5 h-3.5 w-3.5" />
          Clear
        </button>
        <button
          type="button"
          className="flex items-center rounded border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 shadow-sm hover:bg-gray-50"
        >
          <ChevronDownIcon className="mr-1.5 h-3.5 w-3.5" />
          Download
        </button>
      </div>
    </section>
  )
}
