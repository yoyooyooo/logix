import { useMemo } from "react"
import * as LogixReact from "@logix/react"
import type { FormBlueprint, FormController } from "../form.js"

export const useForm = <TValues extends object>(
  blueprint: FormBlueprint<TValues>,
): FormController<TValues> => {
  const moduleRef = LogixReact.useModule(blueprint.impl)

  return useMemo(
    () => blueprint.controller.make(moduleRef.runtime),
    [blueprint, moduleRef.runtime],
  )
}
