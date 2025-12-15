import { useCallback, useMemo } from "react"
import * as LogixReact from "@logix/react"
import type { FormController } from "../form.js"
import { getAtPath } from "../internal/path.js"

export interface FieldArrayItem {
  readonly id: string
}

type RowIdStoreLike = {
  readonly getRowId: (listPath: string, index: number) => string | undefined
  readonly ensureList?: (
    listPath: string,
    items: ReadonlyArray<unknown>,
    trackBy?: string,
  ) => ReadonlyArray<string>
}

const getRowIdStore = (runtime: unknown): RowIdStoreLike | undefined => {
  if (!runtime || typeof runtime !== "object") return undefined
  const store = (runtime as Record<string, unknown>).__rowIdStore
  if (!store || typeof store !== "object") return undefined
  const getRowId = (store as Record<string, unknown>).getRowId
  if (typeof getRowId !== "function") return undefined
  return store as RowIdStoreLike
}

export const useFieldArray = <TValues extends object>(
  form: FormController<TValues>,
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

  const fields = useMemo(
    () => {
      const ensureList = rowIdStore?.ensureList
      const ids =
        typeof ensureList === "function"
          ? (() => {
              try {
                return ensureList(path, items)
              } catch {
                return undefined
              }
            })()
          : undefined

      return items.map((_, index) => ({
        id: ids?.[index] ?? rowIdStore?.getRowId(path, index) ?? String(index),
      }))
    },
    [items, rowIdStore, path],
  )

  const append = useCallback(
    (value: unknown) => {
      dispatch({ _tag: "arrayAppend", payload: { path, value } })
    },
    [dispatch, path],
  )

  const prepend = useCallback(
    (value: unknown) => {
      dispatch({ _tag: "arrayPrepend", payload: { path, value } })
    },
    [dispatch, path],
  )

  const remove = useCallback(
    (index: number) => {
      dispatch({ _tag: "arrayRemove", payload: { path, index } })
    },
    [dispatch, path],
  )

  const swap = useCallback(
    (indexA: number, indexB: number) => {
      dispatch({ _tag: "arraySwap", payload: { path, indexA, indexB } })
    },
    [dispatch, path],
  )

  const move = useCallback(
    (from: number, to: number) => {
      dispatch({ _tag: "arrayMove", payload: { path, from, to } })
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
