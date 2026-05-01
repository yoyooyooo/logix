import { describe, it, expect } from 'vitest'
import type * as Logix from '@logixjs/core'
import { TestProgram } from '../../src/index.js'

const makeAction = (tag: string): Logix.Module.ActionOf<Logix.AnyModuleShape> => ({ _tag: tag, payload: undefined }) as any

describe('@logixjs/test · TestProgram result helpers', () => {
  it('expectNoActionTag should throw when tag exists', () => {
    const result: TestProgram.ExecutionResult<Logix.AnyModuleShape> = {
      state: {} as any,
      actions: [makeAction('a'), makeAction('b')],
      trace: [],
    }

    expect(() => TestProgram.expectNoActionTag(result, 'a')).toThrowError(/Expected no actions with tag "a"/)
    expect(() => TestProgram.expectNoActionTag(result, 'x')).not.toThrow()
  })

  it('expectActionSequence should assert exact tag sequence', () => {
    const result: TestProgram.ExecutionResult<Logix.AnyModuleShape> = {
      state: {} as any,
      actions: [makeAction('inc'), makeAction('inc'), makeAction('dec')],
      trace: [],
    }

    expect(() => TestProgram.expectActionSequence(result, ['inc', 'inc', 'dec'])).not.toThrow()

    expect(() => TestProgram.expectActionSequence(result, ['inc', 'dec'])).toThrowError(/Expected action tag sequence/)

    expect(() => TestProgram.expectActionSequence(result, ['inc', 'dec', 'inc'])).toThrowError(
      /Expected action tag sequence/,
    )
  })
})
