import { describe, expect, it } from 'vitest'
import { resolveDriverAction } from './driverRunner.js'
import type { InteractionDriver } from './driverModel.js'

describe('driver runner', () => {
  it('projects curated dispatch drivers into session actions', () => {
    const driver: InteractionDriver = {
      id: 'increase',
      label: 'Increase',
      operation: 'dispatch',
      actionTag: 'increment',
      payload: { kind: 'void' },
      readAnchors: [{ id: 'counter', label: 'Counter', target: 'state' }],
    }

    expect(resolveDriverAction(driver)).toEqual({ _tag: 'increment', payload: undefined })
  })

  it('uses selected example payloads without exposing raw action objects', () => {
    const driver: InteractionDriver = {
      id: 'set-count',
      label: 'Set count',
      operation: 'dispatch',
      actionTag: 'setCount',
      payload: { kind: 'json', value: 5 },
      examples: [
        { id: 'ten', label: 'Ten', payload: 10 },
      ],
      readAnchors: [],
    }

    expect(resolveDriverAction(driver, 'ten')).toEqual({ _tag: 'setCount', payload: 10 })
    expect(resolveDriverAction(driver, 'missing')).toEqual({ _tag: 'setCount', payload: 5 })
  })
})
