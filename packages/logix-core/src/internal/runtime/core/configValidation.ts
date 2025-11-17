import { Schema } from 'effect'
import { isDevEnv } from './env.js'
import {
  normalizeBoolean,
  normalizeNonNegativeNumber,
  normalizePositiveInt,
  normalizePositiveNumber,
} from './normalize.js'

const PositiveIntSchema = Schema.Int.pipe(Schema.positive())
const PositiveNumberSchema = Schema.Number.pipe(Schema.positive())
const ConvergeModeSchema = Schema.Union(Schema.Literal('auto'), Schema.Literal('full'), Schema.Literal('dirty'))
const InstrumentationSchema = Schema.Union(Schema.Literal('full'), Schema.Literal('light'))
const ConcurrencyLimitSchema = Schema.Union(Schema.Literal('unbounded'), PositiveIntSchema)

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const warnDevOnly = (label: string, issues: ReadonlyArray<string>): void => {
  if (!isDevEnv()) return
  if (issues.length === 0) return
  // eslint-disable-next-line no-console
  console.warn(
    ['[Logix] Invalid runtime config detected.', `context: ${label}`, 'issues:']
      .concat(issues.map((i) => `- ${i}`))
      .join('\n'),
  )
}

const collectUnknownKeys = (
  obj: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  prefix: string,
): ReadonlyArray<string> => {
  const issues: string[] = []
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) {
      issues.push(`${prefix}${key}: unknown key`)
    }
  }
  return issues
}

const validateConcurrencyPolicyPatch = (obj: Record<string, unknown>, prefix: string): ReadonlyArray<string> => {
  const issues: string[] = []

  if ('concurrencyLimit' in obj && obj.concurrencyLimit != null) {
    if (!Schema.is(ConcurrencyLimitSchema)(obj.concurrencyLimit)) {
      issues.push(`${prefix}concurrencyLimit: expected positive int | "unbounded"`)
    }
  }

  if ('losslessBackpressureCapacity' in obj && obj.losslessBackpressureCapacity != null) {
    if (normalizePositiveInt(obj.losslessBackpressureCapacity) == null) {
      issues.push(`${prefix}losslessBackpressureCapacity: expected positive int`)
    }
  }

  if ('allowUnbounded' in obj && obj.allowUnbounded != null) {
    if (normalizeBoolean(obj.allowUnbounded) == null) {
      issues.push(`${prefix}allowUnbounded: expected boolean`)
    }
  }

  if ('pressureWarningThreshold' in obj && obj.pressureWarningThreshold != null) {
    const threshold = obj.pressureWarningThreshold
    if (!isRecord(threshold)) {
      issues.push(`${prefix}pressureWarningThreshold: expected object`)
    } else {
      const backlogCount = threshold['backlogCount']
      if (backlogCount != null) {
        if (normalizePositiveInt(backlogCount) == null) {
          issues.push(`${prefix}pressureWarningThreshold.backlogCount: expected positive int`)
        }
      }
      const backlogDurationMs = threshold['backlogDurationMs']
      if (backlogDurationMs != null) {
        if (normalizePositiveNumber(backlogDurationMs) == null) {
          issues.push(`${prefix}pressureWarningThreshold.backlogDurationMs: expected positive number`)
        }
      }
    }
  }

  if ('warningCooldownMs' in obj && obj.warningCooldownMs != null) {
    if (normalizePositiveNumber(obj.warningCooldownMs) == null) {
      issues.push(`${prefix}warningCooldownMs: expected positive number`)
    }
  }

  return issues
}

export const warnInvalidConcurrencyPolicyDevOnly = (value: unknown, label: string): void => {
  if (!isDevEnv()) return
  if (value == null) return

  if (!isRecord(value)) {
    warnDevOnly(label, ['expected object'])
    return
  }

  const policy = value
  const issues: string[] = []

  issues.push(
    ...collectUnknownKeys(
      policy,
      new Set([
        'concurrencyLimit',
        'losslessBackpressureCapacity',
        'allowUnbounded',
        'pressureWarningThreshold',
        'warningCooldownMs',
        'overridesByModuleId',
      ]),
      '',
    ),
  )

  issues.push(...validateConcurrencyPolicyPatch(policy, ''))

  const overridesByModuleId = policy.overridesByModuleId
  if (overridesByModuleId != null) {
    if (!isRecord(overridesByModuleId)) {
      issues.push(`overridesByModuleId: expected record`)
    } else {
      for (const [moduleId, patch] of Object.entries(overridesByModuleId)) {
        const prefix = `overridesByModuleId.${moduleId}.`
        if (patch == null) continue
        if (!isRecord(patch)) {
          issues.push(`${prefix}<value>: expected object`)
          continue
        }
        issues.push(
          ...collectUnknownKeys(
            patch,
            new Set([
              'concurrencyLimit',
              'losslessBackpressureCapacity',
              'allowUnbounded',
              'pressureWarningThreshold',
              'warningCooldownMs',
            ]),
            prefix,
          ),
        )
        issues.push(...validateConcurrencyPolicyPatch(patch, prefix))
      }
    }
  }

  warnDevOnly(label, issues)
}

export const warnInvalidConcurrencyPolicyPatchDevOnly = (value: unknown, label: string): void => {
  if (!isDevEnv()) return
  if (value == null) return
  if (!isRecord(value)) {
    warnDevOnly(label, ['expected object'])
    return
  }

  const issues: string[] = []
  issues.push(
    ...collectUnknownKeys(
      value,
      new Set([
        'concurrencyLimit',
        'losslessBackpressureCapacity',
        'allowUnbounded',
        'pressureWarningThreshold',
        'warningCooldownMs',
      ]),
      '',
    ),
  )
  issues.push(...validateConcurrencyPolicyPatch(value, ''))

  warnDevOnly(label, issues)
}

const validateStateTransactionTraitOverrides = (
  obj: Record<string, unknown>,
  prefix: string,
): ReadonlyArray<string> => {
  const issues: string[] = []

  if ('traitConvergeMode' in obj && obj.traitConvergeMode != null) {
    if (!Schema.is(ConvergeModeSchema)(obj.traitConvergeMode)) {
      issues.push(`${prefix}traitConvergeMode: expected "auto" | "full" | "dirty"`)
    }
  }
  if ('traitConvergeBudgetMs' in obj && obj.traitConvergeBudgetMs != null) {
    if (normalizePositiveNumber(obj.traitConvergeBudgetMs) == null) {
      issues.push(`${prefix}traitConvergeBudgetMs: expected positive number`)
    }
  }
  if ('traitConvergeDecisionBudgetMs' in obj && obj.traitConvergeDecisionBudgetMs != null) {
    if (normalizePositiveNumber(obj.traitConvergeDecisionBudgetMs) == null) {
      issues.push(`${prefix}traitConvergeDecisionBudgetMs: expected positive number`)
    }
  }
  if ('traitConvergeTimeSlicing' in obj && obj.traitConvergeTimeSlicing != null) {
    const timeSlicing = obj.traitConvergeTimeSlicing
    if (!isRecord(timeSlicing)) {
      issues.push(`${prefix}traitConvergeTimeSlicing: expected object`)
    } else {
      const tsPrefix = `${prefix}traitConvergeTimeSlicing.`
      issues.push(...collectUnknownKeys(timeSlicing, new Set(['enabled', 'debounceMs', 'maxLagMs']), tsPrefix))

      if ('enabled' in timeSlicing && timeSlicing.enabled != null) {
        if (typeof timeSlicing.enabled !== 'boolean') {
          issues.push(`${tsPrefix}enabled: expected boolean`)
        }
      }
      if ('debounceMs' in timeSlicing && timeSlicing.debounceMs != null) {
        if (normalizePositiveNumber(timeSlicing.debounceMs) == null) {
          issues.push(`${tsPrefix}debounceMs: expected positive number`)
        }
      }
      if ('maxLagMs' in timeSlicing && timeSlicing.maxLagMs != null) {
        if (normalizePositiveNumber(timeSlicing.maxLagMs) == null) {
          issues.push(`${tsPrefix}maxLagMs: expected positive number`)
        }
      }
    }
  }

  return issues
}

const validateTxnLanesPatch = (obj: Record<string, unknown>, prefix: string): ReadonlyArray<string> => {
  const issues: string[] = []

  if ('enabled' in obj && obj.enabled != null) {
    if (normalizeBoolean(obj.enabled) == null) {
      issues.push(`${prefix}enabled: expected boolean`)
    }
  }

  if ('overrideMode' in obj && obj.overrideMode != null) {
    const raw = obj.overrideMode
    if (typeof raw !== 'string' || (raw !== 'forced_off' && raw !== 'forced_sync')) {
      issues.push(`${prefix}overrideMode: expected "forced_off" | "forced_sync"`)
    }
  }

  if ('budgetMs' in obj && obj.budgetMs != null) {
    if (normalizeNonNegativeNumber(obj.budgetMs) == null) {
      issues.push(`${prefix}budgetMs: expected non-negative number`)
    }
  }

  if ('debounceMs' in obj && obj.debounceMs != null) {
    if (normalizeNonNegativeNumber(obj.debounceMs) == null) {
      issues.push(`${prefix}debounceMs: expected non-negative number`)
    }
  }

  if ('maxLagMs' in obj && obj.maxLagMs != null) {
    if (normalizeNonNegativeNumber(obj.maxLagMs) == null) {
      issues.push(`${prefix}maxLagMs: expected non-negative number`)
    }
  }

  if ('allowCoalesce' in obj && obj.allowCoalesce != null) {
    if (normalizeBoolean(obj.allowCoalesce) == null) {
      issues.push(`${prefix}allowCoalesce: expected boolean`)
    }
  }

  if ('yieldStrategy' in obj && obj.yieldStrategy != null) {
    const raw = obj.yieldStrategy
    if (typeof raw !== 'string' || (raw !== 'baseline' && raw !== 'inputPending')) {
      issues.push(`${prefix}yieldStrategy: expected "baseline" | "inputPending"`)
    }
  }

  return issues
}

export const warnInvalidStateTransactionTraitConvergeOverridesDevOnly = (value: unknown, label: string): void => {
  if (!isDevEnv()) return
  if (value == null) return
  if (!isRecord(value)) {
    warnDevOnly(label, ['expected object'])
    return
  }

  const issues: string[] = []
  issues.push(
    ...collectUnknownKeys(
      value,
      new Set([
        'traitConvergeBudgetMs',
        'traitConvergeDecisionBudgetMs',
        'traitConvergeMode',
        'traitConvergeTimeSlicing',
      ]),
      '',
    ),
  )
  issues.push(...validateStateTransactionTraitOverrides(value, ''))

  warnDevOnly(label, issues)
}

export const warnInvalidStateTransactionRuntimeConfigDevOnly = (value: unknown, label: string): void => {
  if (!isDevEnv()) return
  if (value == null) return
  if (!isRecord(value)) {
    warnDevOnly(label, ['expected object'])
    return
  }

  const issues: string[] = []
  issues.push(
    ...collectUnknownKeys(
      value,
      new Set([
        'instrumentation',
        'traitConvergeBudgetMs',
        'traitConvergeDecisionBudgetMs',
        'traitConvergeMode',
        'traitConvergeTimeSlicing',
        'traitConvergeOverridesByModuleId',
        'txnLanes',
        'txnLanesOverridesByModuleId',
      ]),
      '',
    ),
  )

  if ('instrumentation' in value && value.instrumentation != null) {
    if (!Schema.is(InstrumentationSchema)(value.instrumentation)) {
      issues.push(`instrumentation: expected "full" | "light"`)
    }
  }

  issues.push(...validateStateTransactionTraitOverrides(value, ''))

  const txnLanes = (value as any).txnLanes
  if (txnLanes != null) {
    if (!isRecord(txnLanes)) {
      issues.push(`txnLanes: expected object`)
    } else {
      const prefix = 'txnLanes.'
      issues.push(
        ...collectUnknownKeys(
          txnLanes,
          new Set(['enabled', 'overrideMode', 'budgetMs', 'debounceMs', 'maxLagMs', 'allowCoalesce', 'yieldStrategy']),
          prefix,
        ),
      )
      issues.push(...validateTxnLanesPatch(txnLanes, prefix))
    }
  }

  const overridesByModuleId = value.traitConvergeOverridesByModuleId
  if (overridesByModuleId != null) {
    if (!isRecord(overridesByModuleId)) {
      issues.push(`traitConvergeOverridesByModuleId: expected record`)
    } else {
      for (const [moduleId, patch] of Object.entries(overridesByModuleId)) {
        const prefix = `traitConvergeOverridesByModuleId.${moduleId}.`
        if (patch == null) continue
        if (!isRecord(patch)) {
          issues.push(`${prefix}<value>: expected object`)
          continue
        }
        issues.push(
          ...collectUnknownKeys(
            patch,
            new Set([
              'traitConvergeMode',
              'traitConvergeBudgetMs',
              'traitConvergeDecisionBudgetMs',
              'traitConvergeTimeSlicing',
            ]),
            prefix,
          ),
        )
        issues.push(...validateStateTransactionTraitOverrides(patch, prefix))
      }
    }
  }

  const lanesOverridesByModuleId = (value as any).txnLanesOverridesByModuleId
  if (lanesOverridesByModuleId != null) {
    if (!isRecord(lanesOverridesByModuleId)) {
      issues.push(`txnLanesOverridesByModuleId: expected record`)
    } else {
      for (const [moduleId, patch] of Object.entries(lanesOverridesByModuleId)) {
        const prefix = `txnLanesOverridesByModuleId.${moduleId}.`
        if (patch == null) continue
        if (!isRecord(patch)) {
          issues.push(`${prefix}<value>: expected object`)
          continue
        }
        issues.push(
          ...collectUnknownKeys(
            patch,
            new Set([
              'enabled',
              'overrideMode',
              'budgetMs',
              'debounceMs',
              'maxLagMs',
              'allowCoalesce',
              'yieldStrategy',
            ]),
            prefix,
          ),
        )
        issues.push(...validateTxnLanesPatch(patch, prefix))
      }
    }
  }

  warnDevOnly(label, issues)
}

export const warnInvalidStateTransactionOverridesDevOnly = (value: unknown, label: string): void => {
  if (!isDevEnv()) return
  if (value == null) return
  if (!isRecord(value)) {
    warnDevOnly(label, ['expected object'])
    return
  }

  const issues: string[] = []
  issues.push(
    ...collectUnknownKeys(
      value,
      new Set([
        'traitConvergeBudgetMs',
        'traitConvergeDecisionBudgetMs',
        'traitConvergeMode',
        'traitConvergeTimeSlicing',
        'traitConvergeOverridesByModuleId',
        'txnLanes',
        'txnLanesOverridesByModuleId',
      ]),
      '',
    ),
  )

  issues.push(...validateStateTransactionTraitOverrides(value, ''))

  const txnLanes = (value as any).txnLanes
  if (txnLanes != null) {
    if (!isRecord(txnLanes)) {
      issues.push(`txnLanes: expected object`)
    } else {
      const prefix = 'txnLanes.'
      issues.push(
        ...collectUnknownKeys(
          txnLanes,
          new Set(['enabled', 'overrideMode', 'budgetMs', 'debounceMs', 'maxLagMs', 'allowCoalesce']),
          prefix,
        ),
      )
      issues.push(...validateTxnLanesPatch(txnLanes, prefix))
    }
  }

  const overridesByModuleId = value.traitConvergeOverridesByModuleId
  if (overridesByModuleId != null) {
    if (!isRecord(overridesByModuleId)) {
      issues.push(`traitConvergeOverridesByModuleId: expected record`)
    } else {
      for (const [moduleId, patch] of Object.entries(overridesByModuleId)) {
        const prefix = `traitConvergeOverridesByModuleId.${moduleId}.`
        if (patch == null) continue
        if (!isRecord(patch)) {
          issues.push(`${prefix}<value>: expected object`)
          continue
        }
        issues.push(
          ...collectUnknownKeys(
            patch,
            new Set([
              'traitConvergeMode',
              'traitConvergeBudgetMs',
              'traitConvergeDecisionBudgetMs',
              'traitConvergeTimeSlicing',
            ]),
            prefix,
          ),
        )
        issues.push(...validateStateTransactionTraitOverrides(patch, prefix))
      }
    }
  }

  const lanesOverridesByModuleId = (value as any).txnLanesOverridesByModuleId
  if (lanesOverridesByModuleId != null) {
    if (!isRecord(lanesOverridesByModuleId)) {
      issues.push(`txnLanesOverridesByModuleId: expected record`)
    } else {
      for (const [moduleId, patch] of Object.entries(lanesOverridesByModuleId)) {
        const prefix = `txnLanesOverridesByModuleId.${moduleId}.`
        if (patch == null) continue
        if (!isRecord(patch)) {
          issues.push(`${prefix}<value>: expected object`)
          continue
        }
        issues.push(
          ...collectUnknownKeys(
            patch,
            new Set(['enabled', 'overrideMode', 'budgetMs', 'debounceMs', 'maxLagMs', 'allowCoalesce']),
            prefix,
          ),
        )
        issues.push(...validateTxnLanesPatch(patch, prefix))
      }
    }
  }

  warnDevOnly(label, issues)
}
