import { describe } from 'vitest'
import { expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import * as Logix from '../../src/index.js'

describe('Observability control commands (clear/pause/resume)', () => {
  it.effect('should clear and pause/resume the devtools recording window', () =>
    Effect.gen(function* () {
      Logix.Debug.clearDevtoolsEvents()

      const layer = Logix.Debug.devtoolsHubLayer({
        bufferSize: 10,
        diagnosticsLevel: 'full',
      })

      yield* Logix.Debug.record({
        type: 'module:init',
        moduleId: 'M',
        instanceId: 'i-1',
      }).pipe(Effect.provide(layer))

      expect(Logix.Debug.getDevtoolsSnapshot().events.length).toBeGreaterThan(0)

      const pauseAck = Logix.Debug.sendControlCommand({
        protocolVersion: Logix.Observability.protocolVersion,
        commandSeq: 1,
        type: 'pause',
      })
      expect(pauseAck.accepted).toBe(true)
      expect(Logix.Debug.isDevtoolsRecordingPaused()).toBe(true)

      const before = Logix.Debug.getDevtoolsSnapshot().events.length
      yield* Logix.Debug.record({
        type: 'action:dispatch',
        moduleId: 'M',
        instanceId: 'i-1',
        action: { _tag: 'A' },
      }).pipe(Effect.provide(layer))

      expect(Logix.Debug.getDevtoolsSnapshot().events.length).toBe(before)

      const resumeAck = Logix.Debug.sendControlCommand({
        protocolVersion: Logix.Observability.protocolVersion,
        commandSeq: 2,
        type: 'resume',
      })
      expect(resumeAck.accepted).toBe(true)
      expect(Logix.Debug.isDevtoolsRecordingPaused()).toBe(false)

      yield* Logix.Debug.record({
        type: 'action:dispatch',
        moduleId: 'M',
        instanceId: 'i-1',
        action: { _tag: 'B' },
      }).pipe(Effect.provide(layer))

      expect(Logix.Debug.getDevtoolsSnapshot().events.length).toBeGreaterThan(before)

      const clearAck = Logix.Debug.sendControlCommand({
        protocolVersion: Logix.Observability.protocolVersion,
        commandSeq: 3,
        type: 'clear',
      })
      expect(clearAck.accepted).toBe(true)
      expect(Logix.Debug.getDevtoolsSnapshot().events.length).toBe(0)
    }),
  )
})

