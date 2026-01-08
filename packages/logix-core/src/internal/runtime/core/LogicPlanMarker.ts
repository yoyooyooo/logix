export type PhaseRef = { current: 'setup' | 'run' }

const LOGIC_PLAN_EFFECT = Symbol.for('@logixjs/core/logicPlanEffect')
const LOGIC_PHASE_REF = Symbol.for('@logixjs/core/logicPhaseRef')
const LOGIC_SKIP_RUN = Symbol.for('@logixjs/core/logicSkipRun')

const defineHidden = (target: object, key: symbol, value: unknown): void => {
  Object.defineProperty(target, key, {
    value,
    enumerable: false,
    configurable: true,
    writable: false,
  })
}

export const markAsLogicPlanEffect = (value: unknown): void => {
  if (!value || typeof value !== 'object') return
  defineHidden(value as object, LOGIC_PLAN_EFFECT, true)
}

export const isLogicPlanEffect = (value: unknown): boolean =>
  Boolean(value && typeof value === 'object' && (value as any)[LOGIC_PLAN_EFFECT] === true)

export const attachPhaseRef = (value: unknown, phaseRef: PhaseRef): void => {
  if (!value || typeof value !== 'object') return
  defineHidden(value as object, LOGIC_PHASE_REF, phaseRef)
}

export const getPhaseRef = (value: unknown): PhaseRef | undefined => {
  if (!value || typeof value !== 'object') return undefined
  return (value as any)[LOGIC_PHASE_REF] as PhaseRef | undefined
}

export const markSkipRun = (plan: unknown): void => {
  if (!plan || typeof plan !== 'object') return
  defineHidden(plan as object, LOGIC_SKIP_RUN, true)
}

export const isSkipRun = (plan: unknown): boolean =>
  Boolean(plan && typeof plan === 'object' && (plan as any)[LOGIC_SKIP_RUN] === true)
