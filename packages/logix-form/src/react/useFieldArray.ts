import { useCallback, useMemo } from 'react'
import type * as Logix from '@logix/core'
import * as LogixReact from '@logix/react'
import type { FormAction, FormState } from '../Form.js'
import { getAtPath } from '../internal/form/path.js'
import { getFieldArrayItemId, getRowIdStore, getTrackByForListPath } from '../internal/form/rowid.js'

export interface FieldArrayItem {
  readonly id: string
}

type FormRuntimeHandle<TValues extends object> = {
  readonly runtime: Logix.ModuleRuntime<FormState<TValues>, FormAction>
}

export const useFieldArray = <TValues extends object>(
  form: FormRuntimeHandle<TValues>,
  path: string,
): {
  readonly fields: ReadonlyArray<FieldArrayItem>
  readonly append: (value: unknown) => void
  readonly prepend: (value: unknown) => void
  readonly remove: (index: number) => void
  readonly swap: (indexA: number, indexB: number) => void
  readonly move: (from: number, to: number) => void
} => {
  const items = LogixReact.useSelector(form.runtime, (s) => {
    const value = getAtPath(s, path)
    return Array.isArray(value) ? value : []
  })

  const dispatch = LogixReact.useDispatch(form.runtime)
  const rowIdStore = getRowIdStore(form.runtime)
  const trackBy = getTrackByForListPath(form.runtime, path)

  const fields = useMemo(() => {
    const ensureList = rowIdStore?.ensureList
    const rowIds =
      typeof ensureList === 'function'
        ? (() => {
            try {
              return ensureList(path, items, trackBy)
            } catch {
              return undefined
            }
          })()
        : undefined

    return items.map((item, index) => ({
      id: getFieldArrayItemId({
        listPath: path,
        item,
        index,
        trackBy,
        rowIds,
        rowIdStore,
      }),
    }))
  }, [items, rowIdStore, trackBy, path])

  const append = useCallback(
    (value: unknown) => {
      dispatch({ _tag: 'arrayAppend', payload: { path, value } })
    },
    [dispatch, path],
  )

  const prepend = useCallback(
    (value: unknown) => {
      dispatch({ _tag: 'arrayPrepend', payload: { path, value } })
    },
    [dispatch, path],
  )

  const remove = useCallback(
    (index: number) => {
      dispatch({ _tag: 'arrayRemove', payload: { path, index } })
    },
    [dispatch, path],
  )

  const swap = useCallback(
    (indexA: number, indexB: number) => {
      dispatch({ _tag: 'arraySwap', payload: { path, indexA, indexB } })
    },
    [dispatch, path],
  )

  const move = useCallback(
    (from: number, to: number) => {
      dispatch({ _tag: 'arrayMove', payload: { path, from, to } })
    },
    [dispatch, path],
  )

  return useMemo(
    () => ({
      fields,
      append,
      prepend,
      remove,
      swap,
      move,
    }),
    [fields, append, prepend, remove, swap, move],
  )
}
