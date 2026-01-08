import { useCallback, useMemo } from 'react'
import type * as Logix from '@logixjs/core'
import * as LogixReact from '@logixjs/react'
import type { FormAction, FormState } from '../Form.js'
import { getAtPath } from '../internal/form/path.js'
import { toErrorsPath, toManualErrorsPath, toSchemaErrorsPath, toUiPath } from '../Path.js'

const readUiFlag = (ui: unknown, key: string): boolean => {
  if (!ui || typeof ui !== 'object' || Array.isArray(ui)) return false
  return (ui as Record<string, unknown>)[key] === true
}

type FormRuntimeHandle<TValues extends object> = {
  readonly runtime: Logix.ModuleRuntime<FormState<TValues>, FormAction>
}

export const useField = <TValues extends object>(
  form: FormRuntimeHandle<TValues>,
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
  const manualError = LogixReact.useSelector(form.runtime, (s) => getAtPath(s, toManualErrorsPath(path)))
  const ruleError = LogixReact.useSelector(form.runtime, (s) => getAtPath(s, toErrorsPath(path)))
  const schemaError = LogixReact.useSelector(form.runtime, (s) => getAtPath(s, toSchemaErrorsPath(path)))
  const error = useMemo(() => manualError ?? ruleError ?? schemaError, [manualError, ruleError, schemaError])
  const ui = LogixReact.useSelector(form.runtime, (s) => getAtPath(s, toUiPath(path)))

  const touched = useMemo(() => readUiFlag(ui, 'touched'), [ui])
  const dirty = useMemo(() => readUiFlag(ui, 'dirty'), [ui])

  const dispatch = LogixReact.useDispatch(form.runtime)

  const onChange = useCallback(
    (next: unknown) => {
      dispatch({ _tag: 'setValue', payload: { path, value: next } })
    },
    [dispatch, path],
  )

  const onBlur = useCallback(() => {
    dispatch({ _tag: 'blur', payload: { path } })
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
