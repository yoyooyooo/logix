import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { plans } from '../data'
import type { IntentSpec, PlanSpec } from '../types'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

interface GenerateResult {
  plan: PlanSpec
  logs: string[]
}

interface ExecuteResult {
  logs: string[]
}

export function usePlanSimulator(intent: IntentSpec | undefined) {
  const [plan, setPlan] = useState<PlanSpec | undefined>(() =>
    intent ? plans[intent.id] : undefined
  )
  const [logs, setLogs] = useState<string[]>([])

  const appendLogs = (entries: string[]) => {
    setLogs((prev) => [...prev, ...entries])
  }

  const generatePlan = useMutation<GenerateResult, Error, void>({
    mutationFn: async () => {
      if (!intent) throw new Error('No intent selected')
      await wait(420)
      const referencePlan = plans[intent.id]
      const synthesizedPlan: PlanSpec =
        referencePlan ?? ({ intentId: intent.id, version: 'draft', actions: [] } as PlanSpec)
      const newLogs = [
        `[CLI] Loading intent ${intent.id} (${intent.title})`,
        `[CLI] Selecting patterns → ${intent.patterns.map((p) => p.id).join(', ')}`,
        `[CLI] Synthesizing actions (${synthesizedPlan.actions.length})...`,
        '[CLI] Plan ready (dry-run)'
      ]
      return { plan: synthesizedPlan, logs: newLogs }
    },
    onSuccess: ({ plan, logs }) => {
      setPlan(plan)
      appendLogs(logs)
    },
    onError: (error) => {
      appendLogs([`[ERROR] ${error.message}`])
    }
  })

  const executePlan = useMutation<ExecuteResult, Error, void>({
    mutationFn: async () => {
      if (!plan) throw new Error('Please generate plan first')
      await wait(520)
      const actionLogs = plan.actions.map(
        (action, index) =>
          `[${index + 1}/${plan.actions.length}] ${action.type} ${action.path} (${action.template})`
      )
      return {
        logs: [...actionLogs, '[CLI] Execution completed (virtual fs)']
      }
    },
    onSuccess: ({ logs }) => appendLogs(logs),
    onError: (error) => appendLogs([`[ERROR] ${error.message}`])
  })

  const summary = useMemo(() => ({ plan, logs }), [plan, logs])

  return {
    plan: summary.plan,
    logs: summary.logs,
    generatePlan: () => generatePlan.mutate(),
    executePlan: () => executePlan.mutate(),
    isGenerating: generatePlan.isPending,
    isExecuting: executePlan.isPending
  }
}
