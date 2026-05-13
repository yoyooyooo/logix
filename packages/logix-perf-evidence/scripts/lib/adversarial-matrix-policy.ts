export type AdversarialMatrixPolicyMode = 'sparse' | 'cartesian'
export type AdversarialMatrixPolicyStatus = 'pass' | 'blocked'

export type AdversarialMatrixPolicyInput = Readonly<{
  readonly profile: string
  readonly mode?: AdversarialMatrixPolicyMode
  readonly cellCount: number
  readonly axes?: Readonly<Record<string, ReadonlyArray<unknown>>>
  readonly anchors?: ReadonlyArray<string>
  readonly pairs?: ReadonlyArray<string>
  readonly expansionEvidence?: 'blocked-marker' | 'maintainer-override'
}>

export type AdversarialMatrixPolicyReport = Readonly<{
  readonly schemaVersion: 1
  readonly mode: AdversarialMatrixPolicyMode
  readonly status: AdversarialMatrixPolicyStatus
  readonly profile: string
  readonly cellCount: number
  readonly maxCells: number
  readonly reasons: ReadonlyArray<string>
}>

const maxCellsByProfile = (profile: string): number => {
  const normalized = profile.toLowerCase()
  if (normalized === 'quick' || normalized === 'smoke') return 20
  if (normalized === 'soak' || normalized === 'adversarial-soak') return 120
  return 80
}

const cartesianCellCount = (axes: Readonly<Record<string, ReadonlyArray<unknown>>> | undefined): number | undefined => {
  if (!axes) return undefined
  const values = Object.values(axes)
  if (values.length === 0) return 0
  return values.reduce((acc, axis) => acc * Math.max(axis.length, 1), 1)
}

export const evaluateAdversarialMatrixPolicy = (input: AdversarialMatrixPolicyInput): AdversarialMatrixPolicyReport => {
  const mode = input.mode ?? 'sparse'
  const maxCells = maxCellsByProfile(input.profile)
  const computedCartesianCells = cartesianCellCount(input.axes)
  const reasons: string[] = []

  if (input.cellCount > maxCells) {
    reasons.push(`cell count ${input.cellCount} exceeds ${input.profile} profile budget ${maxCells}`)
  }

  if (mode === 'cartesian' && !input.expansionEvidence) {
    reasons.push('full Cartesian matrix requires blocked-marker or maintainer override')
  }

  if (computedCartesianCells !== undefined && mode === 'sparse' && input.cellCount >= computedCartesianCells) {
    reasons.push('sparse policy cannot materialize every Cartesian cell by default')
  }

  return {
    schemaVersion: 1,
    mode,
    status: reasons.length > 0 ? 'blocked' : 'pass',
    profile: input.profile,
    cellCount: input.cellCount,
    maxCells,
    reasons,
  }
}
