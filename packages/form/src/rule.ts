export type RuleFn<Input> = (input: Input) => unknown | undefined

export interface Rule<Input> {
  readonly rules: Readonly<Record<string, RuleFn<Input>>>
}

type MakeConfig<Input> = {
  readonly validate: Readonly<Record<string, RuleFn<Input>>>
}

const isRecordConfig = <Input>(value: unknown): value is MakeConfig<Input> =>
  Boolean(value) &&
  typeof value === "object" &&
  value !== null &&
  "validate" in (value as any)

export const make = <Input>(
  input: MakeConfig<Input> | RuleFn<Input>,
): Rule<Input> => {
  if (isRecordConfig<Input>(input)) {
    return {
      rules: { ...(input.validate as Record<string, RuleFn<Input>>) },
    }
  }
  return {
    rules: { default: input },
  }
}

export const merge = <Input>(
  ...rules: ReadonlyArray<Rule<Input>>
): Rule<Input> => {
  const merged: Record<string, RuleFn<Input>> = {}
  for (const rule of rules) {
    for (const name of Object.keys(rule.rules)) {
      if (merged[name]) {
        throw new Error(`[Form.Rule.merge] Duplicate rule name "${name}"`)
      }
      merged[name] = rule.rules[name]!
    }
  }
  return { rules: merged }
}

