import { useEffect, useMemo, useRef } from 'react'
import * as Logix from '@logixjs/core'
import { useDispatch, useLocalModule, useSelector } from '@logixjs/react'
import { Schema } from 'effect'

const StableBusyStateSchema = Schema.Struct({
  shown: Schema.Boolean,
})

const StableBusyDef = Logix.Module.make('StableBusy', {
  state: StableBusyStateSchema,
  actions: {
    setShown: Schema.Boolean,
  },
  reducers: {
    setShown: (state, action) => (state.shown === action.payload ? state : { ...state, shown: action.payload }),
  },
})

export const useStableBusy = (
  isBusy: boolean,
  options?: { readonly delayMs?: number; readonly minDurationMs?: number },
): boolean => {
  const delayMs = Math.max(0, Math.floor(options?.delayMs ?? 120))
  const minDurationMs = Math.max(0, Math.floor(options?.minDurationMs ?? 200))

  const stableBusy = useLocalModule(
    StableBusyDef,
    useMemo(
      () => ({
        key: 'examples.logix-sandbox-mvp:StableBusy',
        initial: { shown: false },
        deps: [delayMs, minDurationMs],
      }),
      [delayMs, minDurationMs],
    ),
  )

  const shown = useSelector(stableBusy, (s) => s.shown)
  const dispatch = useDispatch(stableBusy)

  const shownAtRef = useRef<number | null>(null)
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current)
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
      showTimerRef.current = null
      hideTimerRef.current = null
      shownAtRef.current = null
    }
  }, [])

  useEffect(() => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current)
      showTimerRef.current = null
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }

    if (isBusy) {
      if (shown) return
      showTimerRef.current = setTimeout(() => {
        shownAtRef.current = Date.now()
        dispatch({ _tag: 'setShown', payload: true })
      }, delayMs)
      return
    }

    if (!shown) {
      shownAtRef.current = null
      return
    }

    const shownAt = shownAtRef.current ?? Date.now()
    const elapsed = Date.now() - shownAt
    const remaining = minDurationMs - elapsed

    if (remaining <= 0) {
      shownAtRef.current = null
      dispatch({ _tag: 'setShown', payload: false })
      return
    }

    hideTimerRef.current = setTimeout(() => {
      shownAtRef.current = null
      dispatch({ _tag: 'setShown', payload: false })
    }, remaining)
  }, [delayMs, dispatch, isBusy, minDurationMs, shown])

  return shown
}
