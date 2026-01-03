import { useEffect, useMemo, useRef } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { MotionDialog, MotionDialogContent } from './ui/motion-dialog'

import type { ArtifactName, TaskItem } from '../api/client'
import { getDisplayTitle } from '../lib/spec-relations'
import { MarkdownPreview } from './MarkdownPreview'
import { Badge } from './ui/badge'
import { Button } from './ui/button'

function smoothScroll(element: HTMLElement, target: number, duration: number) {
  const start = element.scrollTop
  const change = target - start
  const startTime = performance.now()

  function animateScroll(currentTime: number) {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    const ease = 1 - Math.pow(1 - progress, 3)
    element.scrollTop = start + change * ease
    if (progress < 1) {
      requestAnimationFrame(animateScroll)
    }
  }
  requestAnimationFrame(animateScroll)
}

const TASK_HIGHLIGHT_CLASS = 'speckit-task-highlight'
const TASK_HIGHLIGHT_MS = 3000

interface Props {
  open: boolean
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
  open,
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
  const lastHighlightElRef = useRef<HTMLElement | null>(null)
  const highlightTimeoutRef = useRef<number | null>(null)

  const title = useMemo(() => {
    if (!task) return '详情'
    const displayTitle = getDisplayTitle(task)
    return task.taskId ? task.taskId + ' · ' + displayTitle : displayTitle
  }, [task])

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current !== null) {
        window.clearTimeout(highlightTimeoutRef.current)
        highlightTimeoutRef.current = null
      }

      if (lastHighlightElRef.current) {
        lastHighlightElRef.current.classList.remove(TASK_HIGHLIGHT_CLASS)
        lastHighlightElRef.current = null
      }
    }
  }, [])

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
        ? (Array.from(root.querySelectorAll('li')).find((li) => {
            const text = li.textContent ?? ''
            return needles.some((n) => text.includes(n))
          }) ?? null)
        : null)

    if (!(target instanceof HTMLElement)) return

    lastAutoScrollLineRef.current = task.line
    requestAnimationFrame(() => {
      // Manual smooth scroll for speed control (<1s)
      const rootRect = root.getBoundingClientRect()
      const targetRect = target.getBoundingClientRect()
      const relativeTop = targetRect.top - rootRect.top
      const targetScroll = root.scrollTop + relativeTop - root.clientHeight / 2 + targetRect.height / 2

      smoothScroll(root, targetScroll, 600)

      if (highlightTimeoutRef.current !== null) {
        window.clearTimeout(highlightTimeoutRef.current)
        highlightTimeoutRef.current = null
      }

      const last = lastHighlightElRef.current
      if (last && last !== target) {
        last.classList.remove(TASK_HIGHLIGHT_CLASS)
      }

      target.classList.add(TASK_HIGHLIGHT_CLASS)
      lastHighlightElRef.current = target
      highlightTimeoutRef.current = window.setTimeout(() => {
        target.classList.remove(TASK_HIGHLIGHT_CLASS)
        if (lastHighlightElRef.current === target) {
          lastHighlightElRef.current = null
        }
        highlightTimeoutRef.current = null
      }, TASK_HIGHLIGHT_MS)
    })
  }, [task, fileName, viewMode, content])

  // NOTE: Logic moved to parent AnimatePresence.
  // We assume valid props if rendered.
  return (
    <MotionDialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <MotionDialogContent
        className="right-4 top-4 bottom-4 h-auto w-[600px] max-w-none rounded-none border border-border shadow-2xl outline-none"
        overlayClassName="bg-black/10 backdrop-blur-[1px]"
        motionProps={{
          initial: { opacity: 0, x: 20, scale: 0.98 },
          animate: { opacity: 1, x: 0, scale: 1 },
          exit: { opacity: 0, x: 20, scale: 0.98 },
          transition: { type: 'spring', damping: 25, stiffness: 300 },
        }}
        aria-describedby={undefined} // Suppress warning if description missing
      >
        <DialogPrimitive.Title className="sr-only">Task Detail</DialogPrimitive.Title>
        {specId && task ? (
          <div className="flex h-full flex-col bg-background">
            {/* Header */}
            <div className="flex-none border-b-4 border-double border-border/40 bg-background px-6 py-5">
              <div className="flex items-start justify-between gap-6">
                <div className="min-w-0">
                  <div className="text-xl font-bold font-serif leading-6 text-foreground">{title}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="rounded-none font-mono">
                      {specId}
                    </Badge>
                    <Badge variant="outline" className="rounded-none font-mono">
                      L{task.line}
                    </Badge>
                  </div>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
            </div>

            {/* Controls */}
            <div className="flex h-12 flex-none items-center border-b border-border/30 bg-background px-6">
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-3">
                  <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Source
                  </label>
                  <div className="relative">
                    <select
                      className="h-7 w-40 appearance-none rounded-none border border-border bg-background px-3 pr-8 font-mono text-[11px] text-foreground outline-none transition-colors hover:border-foreground focus-visible:ring-0"
                      value={fileName}
                      onChange={(e) => onSelectFile(e.target.value as ArtifactName)}
                    >
                      <option value="tasks.md">tasks.md</option>
                      <option value="quickstart.md">quickstart.md</option>
                      <option value="data-model.md">data-model.md</option>
                      <option value="research.md">research.md</option>
                      <option value="plan.md">plan.md</option>
                      <option value="spec.md">spec.md</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {error ? <span className="text-xs text-destructive">{error}</span> : null}
                  {viewMode === 'edit' && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 rounded-none border-border px-3 font-mono text-[10px] tracking-wider hover:bg-foreground hover:text-background"
                      disabled={loading}
                      onClick={onSave}
                    >
                      {loading ? 'SAVING...' : 'SAVE'}
                    </Button>
                  )}

                  <div className="flex items-center border border-border bg-background">
                    <button
                      type="button"
                      className={
                        viewMode === 'preview'
                          ? 'bg-foreground px-3 py-1.5 font-mono text-[10px] font-bold tracking-wider text-background transition-colors'
                          : 'bg-transparent px-3 py-1.5 font-mono text-[10px] font-bold tracking-wider text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
                      }
                      onClick={() => onSetViewMode('preview')}
                    >
                      PREVIEW
                    </button>
                    <div className="h-3 w-px bg-border" />
                    <button
                      type="button"
                      className={
                        viewMode === 'edit'
                          ? 'bg-foreground px-3 py-1.5 font-mono text-[10px] font-bold tracking-wider text-background transition-colors'
                          : 'bg-transparent px-3 py-1.5 font-mono text-[10px] font-bold tracking-wider text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
                      }
                      onClick={() => onSetViewMode('edit')}
                    >
                      EDIT
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Editor */}
            <div className="flex-1 overflow-hidden bg-card">
              {viewMode === 'preview' ? (
                <div ref={previewScrollRef} className="scrollbar-none h-full overflow-y-auto p-6">
                  <MarkdownPreview markdown={content} />
                </div>
              ) : (
                <textarea
                  className="h-full w-full resize-none border-0 bg-transparent p-6 font-mono text-[13px] leading-6 text-foreground outline-none placeholder:text-muted-foreground"
                  value={content}
                  onChange={(e) => onChangeContent(e.target.value)}
                  placeholder={loading ? '加载中…' : '文件内容…'}
                  spellCheck={false}
                />
              )}
            </div>
          </div>
        ) : null}
      </MotionDialogContent>
    </MotionDialog>
  )
}
