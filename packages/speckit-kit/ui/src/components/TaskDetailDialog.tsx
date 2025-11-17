import { useEffect, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'

import type { ArtifactName, TaskItem } from '../api/client'
import { getDisplayTitle } from '../lib/spec-relations'
import { MarkdownPreview } from './MarkdownPreview'

interface Props {
  specId: string | null
  task: TaskItem | null
  fileName: ArtifactName
  viewMode: 'preview' | 'edit'
  content: string
  loading: boolean
  error: string | null
  onClose: () => void
  onSelectFile: (name: ArtifactName) => void
  onSetViewMode: (mode: 'preview' | 'edit') => void
  onChangeContent: (next: string) => void
  onSave: () => void
}

export function TaskDetailDialog({
  specId,
  task,
  fileName,
  viewMode,
  content,
  loading,
  error,
  onClose,
  onSelectFile,
  onSetViewMode,
  onChangeContent,
  onSave,
}: Props) {
  const previewScrollRef = useRef<HTMLDivElement | null>(null)
  const lastAutoScrollLineRef = useRef<number | null>(null)

  const title = useMemo(() => {
    if (!task) return '详情'
    const displayTitle = getDisplayTitle(task)
    return task.taskId ? task.taskId + ' · ' + displayTitle : displayTitle
  }, [task])

  useEffect(() => {
    if (!task) return
    if (fileName !== 'tasks.md') return
    if (viewMode !== 'preview') return
    if (lastAutoScrollLineRef.current === task.line) return

    const root = previewScrollRef.current
    if (!root) return

    const exact = root.querySelector(`[data-md-line="${task.line}"]`)
    const needles = Array.from(new Set([task.taskId, getDisplayTitle(task), task.title])).filter(
      (v): v is string => typeof v === 'string' && v.trim() !== '',
    )

    const target =
      exact ??
      (needles.length > 0
        ? Array.from(root.querySelectorAll('li')).find((li) => {
            const text = li.textContent ?? ''
            return needles.some((n) => text.includes(n))
          }) ?? null
        : null)

    if (!(target instanceof HTMLElement)) return

    lastAutoScrollLineRef.current = task.line
    requestAnimationFrame(() => {
      target.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })
  }, [task, fileName, viewMode, content])

  // NOTE: Logic moved to parent AnimatePresence.
  // We assume valid props if rendered.
  if (!specId || !task) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 overflow-hidden"
    >
      <div
        className="absolute inset-0 bg-zinc-900/20 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300, mass: 0.8 }}
          className="w-screen max-w-2xl"
        >
          <div className="flex h-full flex-col bg-[var(--surface-base)] shadow-2xl">
            {/* Header */}
            <div className="flex-none border-b border-[var(--border-subtle)] bg-[var(--surface-float)] px-6 py-5 backdrop-blur-md">
              <div className="flex items-start justify-between gap-6">
                <div className="min-w-0">
                  <div className="text-lg font-semibold text-[var(--text-primary)] leading-6">{title}</div>
                  <div className="mt-1 flex items-center gap-2 font-mono text-xs text-[var(--text-tertiary)] opacity-70">
                    <span>{specId}</span>
                    <span>·</span>
                    <span>L{task.line}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="rounded-full p-2 text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
                  onClick={onClose}
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Controls */}
            <div className="flex-none border-b border-[var(--border-subtle)] bg-[var(--surface-base)] px-6 py-3">
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-[var(--text-secondary)]">Source</label>
                <div className="relative">
                  <select
                    className="appearance-none rounded-lg bg-[var(--surface-card)] pl-3 pr-8 py-1.5 text-sm text-[var(--text-primary)] shadow-sm ring-1 ring-inset ring-[var(--border-subtle)] focus:ring-2 focus:ring-black"
                    value={fileName}
                    onChange={(e) => onSelectFile(e.target.value as ArtifactName)}
                  >
                    <option value="tasks.md">tasks.md</option>
                    <option value="plan.md">plan.md</option>
                    <option value="spec.md">spec.md</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[var(--text-tertiary)]">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                <div className="ml-auto flex items-center gap-3">
                  <div className="flex overflow-hidden rounded-md border border-zinc-200 bg-white text-xs">
                    <button
                      type="button"
                      className={
                        viewMode === 'preview'
                          ? 'bg-zinc-900 px-2 py-1 text-white'
                          : 'px-2 py-1 text-zinc-700 hover:bg-zinc-50'
                      }
                      onClick={() => onSetViewMode('preview')}
                    >
                      预览
                    </button>
                    <button
                      type="button"
                      className={
                        viewMode === 'edit'
                          ? 'bg-zinc-900 px-2 py-1 text-white'
                          : 'px-2 py-1 text-zinc-700 hover:bg-zinc-50'
                      }
                      onClick={() => onSetViewMode('edit')}
                    >
                      编辑
                    </button>
                  </div>

                  {error ? <span className="text-xs text-red-600 animate-pulse">{error}</span> : null}
                  {viewMode === 'edit' && (
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-lg bg-[var(--intent-primary-fg)] px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:brightness-110 disabled:opacity-50 transition-all active:scale-95"
                      disabled={loading}
                      onClick={onSave}
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Editor */}
            <div className="flex-1 overflow-hidden bg-[var(--surface-card)]">
              {viewMode === 'preview' ? (
                <div ref={previewScrollRef} className="scrollbar-none h-full overflow-y-auto p-6">
                  <MarkdownPreview markdown={content} />
                </div>
              ) : (
                <textarea
                  className="h-full w-full resize-none border-0 bg-transparent p-6 font-mono text-[13px] leading-6 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
                  value={content}
                  onChange={(e) => onChangeContent(e.target.value)}
                  placeholder={loading ? 'Loading content...' : 'File content...'}
                  spellCheck={false}
                />
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
