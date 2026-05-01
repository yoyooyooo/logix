import type { WorkbenchLayoutState } from '../state/workbenchTypes.js'

export const workbenchLayoutLimits = {
  filesWidth: { min: 160, max: 320 },
  inspectorWidth: { min: 320, max: 520 },
  bottomHeight: { min: 44, max: 420 },
} as const

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max)

export const defaultWorkbenchLayoutState: WorkbenchLayoutState = {
  filesWidth: 256,
  inspectorWidth: 340,
  bottomHeight: 192,
  filesCollapsed: false,
  bottomCollapsed: false,
}

export const clampWorkbenchLayoutState = (layout: WorkbenchLayoutState): WorkbenchLayoutState => ({
  filesWidth: clamp(layout.filesWidth, workbenchLayoutLimits.filesWidth.min, workbenchLayoutLimits.filesWidth.max),
  inspectorWidth: clamp(layout.inspectorWidth, workbenchLayoutLimits.inspectorWidth.min, workbenchLayoutLimits.inspectorWidth.max),
  bottomHeight: clamp(layout.bottomHeight, workbenchLayoutLimits.bottomHeight.min, workbenchLayoutLimits.bottomHeight.max),
  filesCollapsed: layout.filesCollapsed,
  bottomCollapsed: layout.bottomCollapsed,
})
