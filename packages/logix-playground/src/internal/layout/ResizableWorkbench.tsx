import React from 'react'
import { Group, Panel, Separator, type PanelImperativeHandle } from 'react-resizable-panels'
import type { WorkbenchLayoutState } from '../state/workbenchTypes.js'
import { clampWorkbenchLayoutState, workbenchLayoutLimits } from './layoutState.js'
import { ChevronsLeftRightIcon, ChevronsUpDownIcon } from '../components/icons.js'
import { RenderIsolationRegion } from '../components/renderIsolationProbe.js'

export interface WorkbenchLayoutResizePatch {
  filesWidth?: number
  inspectorWidth?: number
  bottomHeight?: number
}

export interface ResizableWorkbenchProps {
  readonly layout: WorkbenchLayoutState
  readonly onLayoutChange?: (layout: WorkbenchLayoutResizePatch) => void
  readonly commandBar: React.ReactNode
  readonly filesPanel: React.ReactNode
  readonly sourceEditor: React.ReactNode
  readonly runtimeInspector: React.ReactNode
  readonly bottomDrawer: React.ReactNode
}

const clampResizeValue = (
  value: number | undefined,
  limit: { readonly min: number; readonly max: number },
): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return Math.min(Math.max(Math.round(value), limit.min), limit.max)
}

export const normalizeWorkbenchResizePatch = (patch: WorkbenchLayoutResizePatch): WorkbenchLayoutResizePatch => {
  const next: WorkbenchLayoutResizePatch = {}
  const filesWidth = clampResizeValue(patch.filesWidth, workbenchLayoutLimits.filesWidth)
  const inspectorWidth = clampResizeValue(patch.inspectorWidth, workbenchLayoutLimits.inspectorWidth)
  const bottomHeight = clampResizeValue(patch.bottomHeight, workbenchLayoutLimits.bottomHeight)
  if (filesWidth !== undefined) next.filesWidth = filesWidth
  if (inspectorWidth !== undefined) next.inspectorWidth = inspectorWidth
  if (bottomHeight !== undefined) next.bottomHeight = bottomHeight
  return next
}

const readPanelPixels = (panel: PanelImperativeHandle | null): number | undefined => panel?.getSize().inPixels

const collapsedBottomHeight = 36

const resizeHandleClassName = 'group relative z-10 shrink-0 bg-gray-200 transition-colors hover:bg-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 data-[separator=active]:bg-blue-400 data-[separator=focus]:bg-blue-300'
const verticalHandleClassName = `${resizeHandleClassName} flex w-1 cursor-col-resize flex-col items-center justify-center`
const horizontalHandleClassName = `${resizeHandleClassName} flex h-1 cursor-row-resize items-center justify-center`

const VerticalHandleIcon = (): React.ReactElement => (
  <div className="absolute rounded-full border border-gray-200 bg-white p-0.5 opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
    <ChevronsLeftRightIcon className="h-3 w-3 text-gray-400" />
  </div>
)

const HorizontalHandleIcon = (): React.ReactElement => (
  <div className="absolute rounded-full border border-gray-200 bg-white p-0.5 opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
    <ChevronsUpDownIcon className="h-3 w-3 text-gray-400" />
  </div>
)

export function ResizableWorkbench({
  layout,
  onLayoutChange,
  commandBar,
  filesPanel,
  sourceEditor,
  runtimeInspector,
  bottomDrawer,
}: ResizableWorkbenchProps): React.ReactElement {
  const bounded = clampWorkbenchLayoutState(layout)
  const filesWidth = bounded.filesCollapsed ? 48 : bounded.filesWidth
  const bottomHeight = bounded.bottomCollapsed ? collapsedBottomHeight : bounded.bottomHeight
  const filesPanelRef = React.useRef<PanelImperativeHandle | null>(null)
  const inspectorPanelRef = React.useRef<PanelImperativeHandle | null>(null)
  const bottomPanelRef = React.useRef<PanelImperativeHandle | null>(null)
  const previousBottomCollapsedRef = React.useRef(bounded.bottomCollapsed)
  const syncingBottomPanelRef = React.useRef(false)

  if (previousBottomCollapsedRef.current !== bounded.bottomCollapsed) {
    syncingBottomPanelRef.current = true
  }

  const emitResizePatch = React.useCallback((patch: WorkbenchLayoutResizePatch) => {
    const next = normalizeWorkbenchResizePatch(patch)
    const changed: WorkbenchLayoutResizePatch = {}
    if (next.filesWidth !== undefined && next.filesWidth !== bounded.filesWidth) changed.filesWidth = next.filesWidth
    if (next.inspectorWidth !== undefined && next.inspectorWidth !== bounded.inspectorWidth) changed.inspectorWidth = next.inspectorWidth
    if (next.bottomHeight !== undefined && next.bottomHeight !== bounded.bottomHeight) changed.bottomHeight = next.bottomHeight
    if (Object.keys(changed).length > 0) onLayoutChange?.(changed)
  }, [bounded.bottomHeight, bounded.filesWidth, bounded.inspectorWidth, onLayoutChange])

  const handleHorizontalLayoutChanged = React.useCallback(() => {
    emitResizePatch({
      filesWidth: bounded.filesCollapsed ? undefined : readPanelPixels(filesPanelRef.current),
      inspectorWidth: readPanelPixels(inspectorPanelRef.current),
    })
  }, [bounded.filesCollapsed, emitResizePatch])

  const handleVerticalLayoutChanged = React.useCallback(() => {
    if (syncingBottomPanelRef.current) return
    emitResizePatch({
      bottomHeight: bounded.bottomCollapsed ? undefined : readPanelPixels(bottomPanelRef.current),
    })
  }, [bounded.bottomCollapsed, emitResizePatch])

  React.useLayoutEffect(() => {
    const collapsedChanged = previousBottomCollapsedRef.current !== bounded.bottomCollapsed
    previousBottomCollapsedRef.current = bounded.bottomCollapsed
    if (!collapsedChanged) return

    syncingBottomPanelRef.current = true
    bottomPanelRef.current?.resize(bottomHeight)

    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      syncingBottomPanelRef.current = false
      return
    }

    let secondFrame: number | undefined
    const firstFrame = window.requestAnimationFrame(() => {
      bottomPanelRef.current?.resize(bottomHeight)
      secondFrame = window.requestAnimationFrame(() => {
        bottomPanelRef.current?.resize(bottomHeight)
        syncingBottomPanelRef.current = false
      })
    })

    return () => {
      window.cancelAnimationFrame(firstFrame)
      if (secondFrame !== undefined) window.cancelAnimationFrame(secondFrame)
    }
  }, [bounded.bottomCollapsed, bottomHeight])

  return (
    <div
      data-testid="resizable-workbench"
      data-files-collapsed={bounded.filesCollapsed ? 'true' : 'false'}
      data-bottom-collapsed={bounded.bottomCollapsed ? 'true' : 'false'}
      data-files-width={bounded.filesWidth}
      data-inspector-width={bounded.inspectorWidth}
      data-bottom-height={bounded.bottomHeight}
      data-bottom-visible-height={bottomHeight}
      className="flex h-full w-full flex-col overflow-hidden bg-white"
    >
      <RenderIsolationRegion id="top-command-bar">
        <div data-playground-region="top-command-bar" className="h-12 shrink-0 min-w-0">
          {commandBar}
        </div>
      </RenderIsolationRegion>
      <Group
        id="workbench-vertical-panels"
        orientation="vertical"
        className="min-h-0 flex-1"
        onLayoutChanged={handleVerticalLayoutChanged}
        resizeTargetMinimumSize={{ coarse: 32, fine: 8 }}
      >
        <Panel id="workbench-body-panel" minSize={240} className="h-full min-h-0 min-w-0">
          <Group
            id="workbench-horizontal-panels"
            orientation="horizontal"
            className="h-full min-h-0 min-w-0"
            onLayoutChanged={handleHorizontalLayoutChanged}
            resizeTargetMinimumSize={{ coarse: 32, fine: 8 }}
          >
            <Panel
              id="workbench-files-panel"
              panelRef={filesPanelRef}
              defaultSize={filesWidth}
              minSize={bounded.filesCollapsed ? filesWidth : workbenchLayoutLimits.filesWidth.min}
              maxSize={bounded.filesCollapsed ? filesWidth : workbenchLayoutLimits.filesWidth.max}
              disabled={bounded.filesCollapsed}
              groupResizeBehavior="preserve-pixel-size"
              className="h-full min-h-0 min-w-0"
            >
              <RenderIsolationRegion id="files-panel">
                <div data-playground-region="files-panel" className="h-full min-h-0 min-w-0 overflow-hidden border-r border-border">
                  {filesPanel}
                </div>
              </RenderIsolationRegion>
            </Panel>
            <Separator
              id="resize-files-panel"
              aria-label="Resize files panel"
              className={verticalHandleClassName}
              disabled={bounded.filesCollapsed}
            >
              <VerticalHandleIcon />
            </Separator>
            <Panel
              id="workbench-source-panel"
              minSize={480}
              groupResizeBehavior="preserve-relative-size"
              className="h-full min-h-0 min-w-0 bg-[#1e1e1e]"
            >
              <RenderIsolationRegion id="source-editor">
                <div data-playground-region="source-editor" className="h-full min-h-0 min-w-0 overflow-hidden bg-[#1e1e1e]">
                  {sourceEditor}
                </div>
              </RenderIsolationRegion>
            </Panel>
            <Separator
              id="resize-runtime-inspector"
              aria-label="Resize runtime inspector"
              className={verticalHandleClassName}
            >
              <VerticalHandleIcon />
            </Separator>
            <Panel
              id="workbench-runtime-inspector-panel"
              panelRef={inspectorPanelRef}
              defaultSize={bounded.inspectorWidth}
              minSize={workbenchLayoutLimits.inspectorWidth.min}
              maxSize={workbenchLayoutLimits.inspectorWidth.max}
              groupResizeBehavior="preserve-pixel-size"
              className="h-full min-h-0 min-w-0"
            >
              <RenderIsolationRegion id="runtime-inspector">
                <div data-playground-region="runtime-inspector" className="h-full min-h-0 min-w-0 overflow-hidden border-l border-gray-200">
                  {runtimeInspector}
                </div>
              </RenderIsolationRegion>
            </Panel>
          </Group>
        </Panel>
        <Separator
          id="resize-bottom-drawer"
          aria-label="Resize bottom drawer"
          className={horizontalHandleClassName}
          disabled={bounded.bottomCollapsed}
        >
          <HorizontalHandleIcon />
        </Separator>
        <Panel
          id="workbench-bottom-panel"
          panelRef={bottomPanelRef}
          defaultSize={bottomHeight}
          minSize={bounded.bottomCollapsed ? bottomHeight : workbenchLayoutLimits.bottomHeight.min}
          maxSize={bounded.bottomCollapsed ? bottomHeight : workbenchLayoutLimits.bottomHeight.max}
          disabled={bounded.bottomCollapsed}
          groupResizeBehavior="preserve-pixel-size"
          className="min-h-0"
        >
          <RenderIsolationRegion id="bottom-evidence-drawer">
            <div data-playground-region="bottom-evidence-drawer" className="h-full min-h-0 overflow-hidden">
              {bottomDrawer}
            </div>
          </RenderIsolationRegion>
        </Panel>
      </Group>
    </div>
  )
}
