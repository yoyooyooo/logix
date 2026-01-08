import * as LogixReact from '@logixjs/react'
import type { FormAction, FormHandleExt, FormModule, FormState } from '../Form.js'

export const useForm = <Id extends string, TValues extends object>(
  form: FormModule<Id, TValues>,
): LogixReact.ModuleRef<FormState<TValues>, FormAction> & FormHandleExt<TValues> => LogixReact.useModule(form)
