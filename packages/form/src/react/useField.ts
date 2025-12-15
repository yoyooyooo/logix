import { useCallback, useMemo } from "react"
import * as LogixReact from "@logix/react"
import type { FormController } from "../form.js"
import { getAtPath } from "../internal/path.js"

const readUiFlag = (ui: unknown, key: string): boolean => {
  if (!ui || typeof ui !== "object" || Array.isArray(ui)) return false
  return (ui as Record<string, unknown>)[key] === true
}

export const useField = <TValues extends object>(
  form: FormController<TValues>,
  path: string,
): {
  readonly value: unknown
  readonly error: unknown
  readonly touched: boolean
  readonly dirty: boolean
  readonly onChange: (value: unknown) => void
  readonly onBlur: () => void
} => {
  const value = LogixReact.useSelector(form.runtime, (s) => getAtPath(s, path))
  const error = LogixReact.useSelector(form.runtime, (s) => getAtPath(s, `errors.${path}`))
  const ui = LogixReact.useSelector(form.runtime, (s) => getAtPath(s, `ui.${path}`))

  const touched = useMemo(() => readUiFlag(ui, "touched"), [ui])
  const dirty = useMemo(() => readUiFlag(ui, "dirty"), [ui])

  const dispatch = LogixReact.useDispatch(form.runtime)

  const onChange = useCallback(
    (next: unknown) => {
      dispatch({ _tag: "setValue", payload: { path, value: next } })
    },
    [dispatch, path],
  )

  const onBlur = useCallback(() => {
    dispatch({ _tag: "blur", payload: { path } })
  }, [dispatch, path])

  return useMemo(
    () => ({
      value,
      error,
      touched,
      dirty,
      onChange,
      onBlur,
    }),
    [value, error, touched, dirty, onChange, onBlur],
  )
}
