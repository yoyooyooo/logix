import { useCallback, useRef } from 'react'
import type * as Logix from '@logix/core'
import * as LogixReact from '@logix/react'
import type { FormAction, FormState } from '../Form.js'
import type { FormView } from '../FormView.js'
import { getFormView } from '../FormView.js'

type FormRuntimeHandle<TValues extends object> = {
  readonly runtime: Logix.ModuleRuntime<FormState<TValues>, FormAction>
}

export const useFormState = <TValues extends object, V>(
  form: FormRuntimeHandle<TValues>,
  selector: (view: FormView) => V,
  equalityFn?: (previous: V, next: V) => boolean,
): V => {
  const lastViewRef = useRef<FormView | undefined>(undefined)

  const select = useCallback(
    (state: unknown): V => {
      const view = getFormView(state, lastViewRef.current)
      lastViewRef.current = view
      return selector(view)
    },
    [selector],
  )

  return LogixReact.useSelector(form.runtime, select, equalityFn)
}
