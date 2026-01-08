import { describe, it, expect } from 'vitest'
import type * as Logix from '@logixjs/core'
import * as Execution from '../../src/Execution.js'

const makeAction = (tag: string): Logix.ActionOf<Logix.AnyModuleShape> => ({ _tag: tag, payload: undefined }) as any

describe('@logixjs/test · Execution helpers', () => {
  it('expectNoActionTag should throw when tag exists', () => {
    const result: Execution.ExecutionResult<Logix.AnyModuleShape> = {
      state: {} as any,
      actions: [makeAction('a'), makeAction('b')],
      trace: [],
    }

    expect(() => Execution.expectNoActionTag(result, 'a')).toThrowError(/Expected no actions with tag "a"/)
    expect(() => Execution.expectNoActionTag(result, 'x')).not.toThrow()
  })

  it('expectActionSequence should assert exact tag sequence', () => {
    const result: Execution.ExecutionResult<Logix.AnyModuleShape> = {
      state: {} as any,
      actions: [makeAction('inc'), makeAction('inc'), makeAction('dec')],
      trace: [],
    }

    expect(() => Execution.expectActionSequence(result, ['inc', 'inc', 'dec'])).not.toThrow()

    expect(() => Execution.expectActionSequence(result, ['inc', 'dec'])).toThrowError(/Expected action tag sequence/)

    expect(() => Execution.expectActionSequence(result, ['inc', 'dec', 'inc'])).toThrowError(
      /Expected action tag sequence/,
    )
  })
})
