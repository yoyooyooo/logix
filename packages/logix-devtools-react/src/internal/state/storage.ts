import type { DevtoolsSettings, DevtoolsState } from './model.js'
import { defaultSettings } from './model.js'

const LAYOUT_STORAGE_KEY = '__logix_devtools_layout_v2__'
const SETTINGS_STORAGE_KEY = '__logix_devtools_settings_v1__'

export const loadLayoutFromStorage = (): DevtoolsState['layout'] | undefined => {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return undefined
  }
  try {
    const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEY)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as Partial<DevtoolsState['layout']> | null
    if (!parsed || typeof parsed !== 'object') return undefined

    const { height, marginLeft, marginRight, trigger } = parsed as DevtoolsState['layout']
    if (typeof height !== 'number' || typeof marginLeft !== 'number' || typeof marginRight !== 'number') {
      return undefined
    }

    let normalizedTrigger: DevtoolsState['layout']['trigger']
    if (trigger && typeof trigger === 'object') {
      const maybeX = (trigger as any).x
      const maybeY = (trigger as any).y
      if (typeof maybeX === 'number' && typeof maybeY === 'number') {
        normalizedTrigger = {
          x: maybeX,
          y: maybeY,
          isDragging: false,
        }
      }
    }

	    return {
	      height,
	      marginLeft,
	      marginRight,
	      // `dragging` is not persisted; after refresh we always treat it as not dragging.
	      isDragging: false,
	      trigger: normalizedTrigger,
	    }
	  } catch {
	    return undefined
	  }
}

export const persistLayoutToStorage = (layout: DevtoolsState['layout']): void => {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return
  }
  try {
    const { height, marginLeft, marginRight, trigger } = layout
    const payload = {
      height,
      marginLeft,
      marginRight,
      trigger: trigger
        ? {
            x: trigger.x,
            y: trigger.y,
          }
        : undefined,
    }
    window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // ignore storage errors
  }
}

export const clampEventBufferSize = (value: unknown): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 500
  }
  if (value < 100) return 100
  if (value > 5000) return 5000
  return Math.floor(value)
}

export const clampOperationWindowMs = (value: unknown): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 1000
  }
  if (value < 200) return 200
  if (value > 5000) return 5000
  return Math.floor(value)
}

export const clampOverviewHighlightDurationMs = (value: unknown): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 3000
  }
  if (value < 500) return 500
  if (value > 10000) return 10000
  return Math.floor(value)
}

export const loadSettingsFromStorage = (): DevtoolsSettings | undefined => {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return undefined
  }
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as Partial<DevtoolsSettings> | null
    if (!parsed || typeof parsed !== 'object') return undefined

    const mode = parsed.mode === 'basic' || parsed.mode === 'deep' ? parsed.mode : defaultSettings.mode
    const showTraitEvents = typeof parsed.showTraitEvents === 'boolean' ? parsed.showTraitEvents : mode === 'deep'
    const showReactRenderEvents =
      typeof parsed.showReactRenderEvents === 'boolean' ? parsed.showReactRenderEvents : mode === 'deep'
    const enableTimeTravelUI =
      typeof parsed.enableTimeTravelUI === 'boolean' ? parsed.enableTimeTravelUI : defaultSettings.enableTimeTravelUI

    const operationWindowMs = clampOperationWindowMs(
      (parsed as any).operationWindowMs ?? defaultSettings.operationWindowMs,
    )

    const thresholds = parsed.overviewThresholds ?? defaultSettings.overviewThresholds
    const overviewThresholds = {
      txnPerSecondWarn:
        typeof thresholds.txnPerSecondWarn === 'number'
          ? thresholds.txnPerSecondWarn
          : defaultSettings.overviewThresholds.txnPerSecondWarn,
      txnPerSecondDanger:
        typeof thresholds.txnPerSecondDanger === 'number'
          ? thresholds.txnPerSecondDanger
          : defaultSettings.overviewThresholds.txnPerSecondDanger,
      renderPerTxnWarn:
        typeof thresholds.renderPerTxnWarn === 'number'
          ? thresholds.renderPerTxnWarn
          : defaultSettings.overviewThresholds.renderPerTxnWarn,
      renderPerTxnDanger:
        typeof thresholds.renderPerTxnDanger === 'number'
          ? thresholds.renderPerTxnDanger
          : defaultSettings.overviewThresholds.renderPerTxnDanger,
    }

    const overviewHighlightDurationMs = clampOverviewHighlightDurationMs(
      (parsed as any).overviewHighlightDurationMs ?? defaultSettings.overviewHighlightDurationMs,
    )

    const sampling = parsed.sampling ?? defaultSettings.sampling
    const reactRenderSampleRate =
      typeof sampling.reactRenderSampleRate === 'number'
        ? sampling.reactRenderSampleRate
        : defaultSettings.sampling.reactRenderSampleRate

    return {
      mode,
      showTraitEvents,
      showReactRenderEvents,
      enableTimeTravelUI,
      operationWindowMs,
      overviewThresholds,
      overviewHighlightDurationMs,
      eventBufferSize: clampEventBufferSize(parsed.eventBufferSize),
      sampling: {
        reactRenderSampleRate,
      },
    }
  } catch {
    return undefined
  }
}

export const persistSettingsToStorage = (settings: DevtoolsSettings): void => {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return
  }
  try {
    const payload: DevtoolsSettings = {
      ...settings,
      eventBufferSize: clampEventBufferSize(settings.eventBufferSize),
      operationWindowMs: clampOperationWindowMs(settings.operationWindowMs),
      overviewHighlightDurationMs: clampOverviewHighlightDurationMs(settings.overviewHighlightDurationMs),
    }
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // ignore storage errors
  }
}
