import React from 'react'
import { createPortal } from 'react-dom'
import * as Logix from '@logix/core'
import { useDevtoolsState, useDevtoolsDispatch } from '../../DevtoolsHooks.js'
import { Sidebar } from '../sidebar/Sidebar.js'
import { EffectOpTimelineView } from '../timeline/EffectOpTimelineView.js'
import { Inspector } from '../inspector/Inspector.js'
import { OverviewStrip } from '../overview/OverviewStrip.js'
import { OperationSummaryBar } from '../summary/OperationSummaryBar.js'
import { SettingsPanel } from '../settings/SettingsPanel.js'

export interface DevtoolsShellProps {
  position?: 'bottom-left' | 'bottom-right'
}

export interface GetProgramForModule {
  (moduleId: string): Logix.StateTrait.StateTraitProgram<any> | undefined
}

const defaultGetProgramForModule: GetProgramForModule = (moduleId) => {
  const traits = Logix.Debug.getModuleTraitsById(moduleId)
  return traits?.program
}

export const DevtoolsShell: React.FC<DevtoolsShellProps & { getProgramForModule?: GetProgramForModule }> = ({
  position = 'bottom-left',
  getProgramForModule,
}) => {
  const { open, layout, theme, settings, operationSummary } = useDevtoolsState()
  const dispatch = useDevtoolsDispatch()
  const dragStateRef = React.useRef<{
    startMouseX: number
    startMouseY: number
    baseX: number
    baseY: number
    hasMoved: boolean
    lastX: number
    lastY: number
  } | null>(null)
  const suppressClickRef = React.useRef(false)

  const handleToggle = React.useCallback(() => {
    dispatch({ _tag: 'toggleOpen', payload: undefined })
  }, [dispatch])

  const handleResizeStart = React.useCallback(
    (edge: 'top' | 'left' | 'right') => {
      dispatch({ _tag: 'resizeStart', payload: { edge } })
    },
    [dispatch],
  )

  const handleLayoutChange = React.useCallback(
    (partial: Partial<typeof layout>) => {
      dispatch({ _tag: 'updateLayout', payload: partial })
    },
    [dispatch],
  )

  const handleThemeChange = React.useCallback(
    (nextTheme: 'system' | 'light' | 'dark') => {
      dispatch({ _tag: 'setTheme', payload: nextTheme })
    },
    [dispatch],
  )

  const handleModeChange = React.useCallback(
    (nextMode: 'basic' | 'deep') => {
      dispatch({ _tag: 'setMode', payload: nextMode })
    },
    [dispatch],
  )

  React.useEffect(() => {
    if (layout.trigger || typeof window === 'undefined') {
      return
    }
    const isBottomRight = position === 'bottom-right'
    const defaultRight = isBottomRight ? 16 : Math.max(window.innerWidth - 220, 60)
    const defaultBottom = 16
    handleLayoutChange({ trigger: { x: defaultRight, y: defaultBottom, isDragging: false } })
  }, [layout.trigger, position, handleLayoutChange])

  // Apply theme to body/portal
  const effectiveTheme = React.useMemo(() => {
    if (theme === 'system') {
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
      }
      return 'dark'
    }
    return theme
  }, [theme])

  // System listener
  React.useEffect(() => {
    if (theme !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: light)')
    const listener = () => {
      // Force re-render not needed as we read snapshot,
      // but actually useDevtoolsState subscription won't catch OS change unless we trigger an action
      // or we just rely on CSS media query for system?
      // CSS variable approach: for system, we can just NOT set data-theme,
      // but we defined variables for [data-theme="light"].
      // If we want pure system support we probably need separate @media (prefers-color-scheme: light) block in CSS
      // OR we just force component re-render.
      // Easiest is to force dispatch a no-op or handle it in component state.
      // But since we are calculating effectiveTheme here, we just need a re-render.
      // We'll use a local state to track system preference changes.
      setSystemPref(media.matches ? 'light' : 'dark')
    }
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [theme])

  const [_, setSystemPref] = React.useState('dark') // dummy state to trigger re-render on system change

  const [hiddenSummaryStartedAt, setHiddenSummaryStartedAt] = React.useState<number | undefined>(undefined)

  const [settingsOpen, setSettingsOpen] = React.useState(false)

  // 当新的操作摘要到来时，自动取消“手动隐藏”状态。
  React.useEffect(() => {
    if (!operationSummary) return
    if (hiddenSummaryStartedAt != null && operationSummary.startedAt !== hiddenSummaryStartedAt) {
      setHiddenSummaryStartedAt(undefined)
    }
  }, [operationSummary?.startedAt, hiddenSummaryStartedAt])

  const visibleSummary =
    operationSummary && operationSummary.startedAt !== hiddenSummaryStartedAt ? operationSummary : undefined

  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 16,
    left: layout.marginLeft,
    right: layout.marginRight,
    height: layout.height ?? 400,
    zIndex: 1,
    pointerEvents: 'auto',
  }

  const toggleButtonStyle: React.CSSProperties = layout.trigger
    ? {
        position: 'absolute',
        right: layout.trigger.x,
        bottom: layout.trigger.y,
        zIndex: 2,
        pointerEvents: 'auto',
      }
    : position === 'bottom-left'
      ? {
          position: 'absolute',
          bottom: 16,
          left: layout.marginLeft,
          zIndex: 2,
          pointerEvents: 'auto',
        }
      : {
          position: 'absolute',
          bottom: 16,
          right: layout.marginRight,
          zIndex: 2,
          pointerEvents: 'auto',
        }

  const handleButtonMouseDown = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (typeof window === 'undefined') {
      return
    }
    event.preventDefault()
    const startMouseX = event.clientX
    const startMouseY = event.clientY

    const isBottomRight = position === 'bottom-right'
    const defaultRight = isBottomRight ? 16 : Math.max(window.innerWidth - 220, 60)
    const defaultBottom = 16
    const currentTrigger = layout.trigger ?? { x: defaultRight, y: defaultBottom, isDragging: false }

    dragStateRef.current = {
      startMouseX,
      startMouseY,
      baseX: currentTrigger.x,
      baseY: currentTrigger.y,
      hasMoved: false,
      lastX: currentTrigger.x,
      lastY: currentTrigger.y,
    }

    // 标记进入拖拽态（避免频繁写入 storage，isDragging=true 时 updateLayout 不会落盘）。
    handleLayoutChange({
      trigger: { ...currentTrigger, isDragging: true },
    })

    const margin = 40

    const handleMove = (e: MouseEvent) => {
      const state = dragStateRef.current
      if (!state) return
      const winW = window.innerWidth
      const winH = window.innerHeight
      const offsetX = e.clientX - state.startMouseX
      const offsetY = e.clientY - state.startMouseY
      // x / y 表示「距离右下角的偏移量」
      const nextX = Math.min(Math.max(state.baseX - offsetX, margin), winW - margin)
      const nextY = Math.min(Math.max(state.baseY - offsetY, margin), winH - margin)

      if (!state.hasMoved && (Math.abs(offsetX) > 2 || Math.abs(offsetY) > 2)) {
        state.hasMoved = true
      }

      state.lastX = nextX
      state.lastY = nextY

      handleLayoutChange({
        trigger: { x: nextX, y: nextY, isDragging: true },
      })
    }

    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)

      const state = dragStateRef.current
      dragStateRef.current = null

      if (state?.hasMoved) {
        suppressClickRef.current = true
      }

      const finalX = state?.lastX ?? currentTrigger.x
      const finalY = state?.lastY ?? currentTrigger.y

      handleLayoutChange({
        trigger: { x: finalX, y: finalY, isDragging: false },
      })
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }

  const handleButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (suppressClickRef.current) {
      event.preventDefault()
      suppressClickRef.current = false
      return
    }
    handleToggle()
  }

  if (typeof document === 'undefined') {
    return null
  }
  const portalElement = document.body

  const button = !open ? (
    <button
      onMouseDown={handleButtonMouseDown}
      onClick={handleButtonClick}
      className="group flex items-center gap-2 pl-2 pr-4 py-1.5 rounded-full border shadow-xl backdrop-blur-md transition-colors duration-150"
      style={{
        ...toggleButtonStyle,
        backgroundColor: 'var(--dt-bg-root)',
        borderColor: 'var(--dt-border)',
        color: 'var(--dt-text-secondary)',
      }}
    >
      <div className="relative flex items-center justify-center w-4 h-4">
        <span
          className="absolute inline-flex h-2 w-2 rounded-full opacity-75 animate-ping"
          style={{ backgroundColor: 'var(--dt-primary)' }}
        />
        <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: 'var(--dt-primary)' }} />
      </div>
      <span className="text-xs font-medium tracking-wide">Logix Devtools</span>
    </button>
  ) : null

  const panel = open ? (
    <div
      style={{
        ...panelStyle,
        backgroundColor: 'var(--dt-glass)',
        borderColor: 'var(--dt-border)',
      }}
      data-theme={effectiveTheme}
      className="relative flex flex-col backdrop-blur-xl border rounded-xl shadow-[0_0_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden font-sans"
    >
      <div
        onMouseDown={(e) => {
          e.preventDefault()
          handleResizeStart('top')
        }}
        className="absolute top-0 left-0 right-0 h-1.5 cursor-ns-resize hover:bg-emerald-500/50 z-50 transition-colors"
      />

      <div
        onMouseDown={(e) => {
          e.preventDefault()
          handleResizeStart('left')
        }}
        className="absolute top-0 bottom-0 left-0 w-1.5 cursor-ew-resize hover:bg-emerald-500/50 z-50 transition-colors"
      />

      <div
        onMouseDown={(e) => {
          e.preventDefault()
          handleResizeStart('right')
        }}
        className="absolute top-0 bottom-0 right-0 w-1.5 cursor-ew-resize hover:bg-emerald-500/50 z-50 transition-colors"
      />

      <div
        className="h-10 shrink-0 flex items-center justify-between px-4 border-b"
        style={{
          backgroundColor: 'var(--dt-bg-header)',
          borderColor: 'var(--dt-border)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"
              style={{ backgroundColor: 'var(--dt-primary)' }}
            />
            <span className="text-sm font-semibold tracking-tight" style={{ color: 'var(--dt-text-primary)' }}>
              Logix
            </span>
          </div>
          <div className="h-4 w-px mx-1" style={{ backgroundColor: 'var(--dt-border)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--dt-text-muted)' }}>
            Developer Tools
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="flex items-center p-0.5 rounded-lg border"
            style={{
              backgroundColor: 'var(--dt-bg-surface)',
              borderColor: 'var(--dt-border)',
            }}
          >
            {(['basic', 'deep'] as const).map((mode) => {
              const isActive = settings.mode === mode
              return (
                <button
                  key={mode}
                  onClick={() => handleModeChange(mode)}
                  className={`px-2 h-6 flex items-center justify-center rounded text-[10px] font-medium transition-all ${
                    isActive ? 'shadow-sm' : 'hover:bg-white/5'
                  }`}
                  style={{
                    backgroundColor: isActive ? 'var(--dt-bg-active)' : 'transparent',
                    color: isActive ? 'var(--dt-text-primary)' : 'var(--dt-text-muted)',
                  }}
                >
                  {mode === 'basic' ? 'Basic' : 'Deep'}
                </button>
              )
            })}
          </div>

          <div
            className="flex items-center p-0.5 rounded-lg border"
            style={{
              backgroundColor: 'var(--dt-bg-surface)',
              borderColor: 'var(--dt-border)',
            }}
          >
            {[
              { value: 'light', icon: <circle cx="7" cy="7" r="3" />, title: 'Light' },
              { value: 'system', icon: <rect x="2" y="3" width="10" height="7" rx="1" />, title: 'System' },
              { value: 'dark', icon: <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />, title: 'Dark' },
            ].map((item) => {
              const isActive = theme === item.value
              return (
                <button
                  key={item.value}
                  onClick={() => handleThemeChange(item.value as any)}
                  className={`w-5 h-5 flex items-center justify-center rounded transition-all ${
                    isActive ? 'shadow-sm' : 'hover:bg-white/5'
                  }`}
                  style={{
                    backgroundColor: isActive ? 'var(--dt-bg-active)' : 'transparent',
                    color: isActive ? 'var(--dt-text-primary)' : 'var(--dt-text-muted)',
                  }}
                  title={item.title}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {item.value === 'system' && (
                      <>
                        <rect x="2" y="2" width="10" height="7" rx="1" />
                        <path d="M4 12h6" />
                      </>
                    )}
                    {item.value === 'light' && (
                      <>
                        <circle cx="7" cy="7" r="2.5" />
                        <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.75 2.75l1.06 1.06M10.19 10.19l1.06 1.06M2.75 11.25l1.06-1.06M10.19 3.81l1.06-1.06" />
                      </>
                    )}
                    {item.value === 'dark' && <path d="M11.5 8.5a5.5 5.5 0 1 1-7-7 4 4 0 0 0 7 7z" />}
                  </svg>
                </button>
              )
            })}
          </div>

          <div className="w-px h-4" style={{ backgroundColor: 'var(--dt-border)' }} />

          <button
            type="button"
            onClick={() => setSettingsOpen((v) => !v)}
            className="w-6 h-6 flex items-center justify-center rounded-md transition-colors"
            style={{ color: 'var(--dt-text-secondary)' }}
            aria-label="ToggleSettings"
            title="Settings"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.33 1.82V22a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-.33-1.82 1.65 1.65 0 0 0-1-.6 1.65 1.65 0 0 0-1.82.33l-.06.06A2 2 0 1 1 3.46 17l.06-.06A1.65 1.65 0 0 0 4.4 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1.82-.33H2a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.82-.33 1.65 1.65 0 0 0 .6-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 1 1 6.29 3.46l.06.06A1.65 1.65 0 0 0 8 4.4c.37 0 .72-.13 1-.36.28-.23.5-.55.6-.92V2a2 2 0 1 1 4 0v.09c.1.37.32.69.6.92.28.23.63.36 1 .36.53 0 1.04-.21 1.41-.58l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06c-.37.37-.58.88-.58 1.41 0 .37.13.72.36 1 .23.28.55.5.92.6H22a2 2 0 1 1 0 4h-.09c-.37.1-.69.32-.92.6-.23.28-.36.63-.36 1z" />
            </svg>
          </button>

          <button
            onClick={handleToggle}
            className="w-6 h-6 flex items-center justify-center rounded-md transition-colors"
            style={{ color: 'var(--dt-text-secondary)' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M10.5 3.5L3.5 10.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M3.5 3.5L10.5 10.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          onUpdate={(partial) => dispatch({ _tag: 'updateSettings', payload: partial } as any)}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      <OverviewStrip />
      <OperationSummaryBar
        summary={visibleSummary as any}
        onClose={() => {
          if (!operationSummary) return
          setHiddenSummaryStartedAt(operationSummary.startedAt)
        }}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <EffectOpTimelineView />
        <Inspector getProgramForModule={getProgramForModule ?? defaultGetProgramForModule} />
      </div>
    </div>
  ) : null

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    >
      {button}
      {panel}
    </div>,
    portalElement,
  )
}
