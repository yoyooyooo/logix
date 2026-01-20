import { describe, it, expect } from '@effect/vitest'
import { Schema } from 'effect'
import * as Logix from '../../../src/index.js'
import type { InputExpr, WorkflowStaticIr } from '../../../src/Workflow.js'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const makeOversizedObject = (order: 'asc' | 'desc'): Record<string, string> => {
  const keys = Array.from({ length: 32 }, (_, i) => `k${String(i).padStart(2, '0')}`)
  if (order === 'desc') keys.reverse()

  const out: Record<string, string> = {}
  for (const k of keys) {
    out[k] = 'x'.repeat(256)
  }
  return out
}

const findDispatchConstPayload = (ir: WorkflowStaticIr): InputExpr | undefined => {
  const node = ir.nodes.find((n) => n.kind === 'step' && n.step.kind === 'dispatch')
  if (!node || node.kind !== 'step' || node.step.kind !== 'dispatch') return undefined
  return node.step.payload
}

describe('ControlSurfaceManifest + workflowSurface (075)', () => {
  it('FR-005: budgets/oversized projection is deterministic (stable digest + preview)', () => {
    const programA = Logix.Workflow.make({
      localId: 'p',
      trigger: Logix.Workflow.onAction('a'),
      steps: [
        Logix.Workflow.dispatch({
          key: 'dispatch.a',
          actionTag: 'a',
          payload: Logix.Workflow.constValue(makeOversizedObject('asc')),
        }),
      ],
    })

    const programB = Logix.Workflow.make({
      localId: 'p',
      trigger: Logix.Workflow.onAction('a'),
      steps: [
        Logix.Workflow.dispatch({
          key: 'dispatch.a',
          actionTag: 'a',
          payload: Logix.Workflow.constValue(makeOversizedObject('desc')),
        }),
      ],
    })

    const irA = programA.exportStaticIr('ControlSurface.075.Budgets')
    const irB = programB.exportStaticIr('ControlSurface.075.Budgets')

    expect(irA.digest).toBe(irB.digest)

    const payloadA = findDispatchConstPayload(irA)
    const payloadB = findDispatchConstPayload(irB)

    expect(payloadA?.kind).toBe('const')
    expect(payloadB?.kind).toBe('const')
    if (!payloadA || payloadA.kind !== 'const' || !payloadB || payloadB.kind !== 'const') {
      throw new Error('Expected both payloads to be InputExpr.const')
    }
    if (!isRecord(payloadA.value) || !isRecord(payloadB.value)) {
      throw new Error('Expected oversized const payload to be an object')
    }
    expect(payloadA.value._tag).toBe('oversized')
    expect(payloadB.value._tag).toBe('oversized')
    expect(payloadA.value.preview).toBe(payloadB.value.preview)
  })

  it('FR-001/FR-007: Reflection.exportControlSurface wires workflowSurface digest + effectsIndex', () => {
    const M = Logix.Module.make('ControlSurface.075', {
      state: Schema.Struct({ n: Schema.Number }),
      actions: { a: Schema.Void },
    })

    const program = Logix.Workflow.make({
      localId: 'p',
      trigger: Logix.Workflow.onAction('a'),
      steps: [
        Logix.Workflow.dispatch({
          key: 'dispatch.a',
          actionTag: 'a',
          payload: Logix.Workflow.constValue(makeOversizedObject('asc')),
        }),
      ],
    })

    const module = M.withWorkflow(program).implement({ initial: { n: 0 } })
    const exported = Logix.Reflection.exportControlSurface([module])

    expect(exported.manifest.modules).toHaveLength(1)
    expect(exported.workflowSurfaces).toHaveLength(1)

    const manifestModule = exported.manifest.modules[0]!
    const surface = exported.workflowSurfaces[0]!

    expect(manifestModule.moduleId).toBe('ControlSurface.075')
    expect(manifestModule.workflowSurface?.digest).toBe(surface.surface.digest)
    expect(manifestModule.effectsIndex.length).toBeGreaterThanOrEqual(1)
    const entry0 = manifestModule.effectsIndex[0]
    expect(entry0?.kind).toBe('workflow')
    if (!entry0 || entry0.kind !== 'workflow') {
      throw new Error('Expected effectsIndex[0] to be a workflow entry')
    }
    expect(entry0.programId).toBe('ControlSurface.075.p')

    const expectedIr = program.exportStaticIr('ControlSurface.075')
    expect(surface.surface.programs[0]?.digest).toBe(expectedIr.digest)
  })
})
