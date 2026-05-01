import { describe, expect, it } from 'vitest'
import {
  assertSameEvidenceCoordinate,
  parseEvidenceCoordinateText,
} from './playground-evidence-coordinate'

describe('Playground evidence coordinate test helper', () => {
  it('parses the stable evidence coordinate projection', () => {
    expect(parseEvidenceCoordinateText([
      'projectId=logix-react.local-counter',
      'sourceRevision=3',
      'sourceDigest=playground-source:abc',
      'operationKind=run',
      'operationId=logix-react.local-counter:r3:txn3:op4',
    ].join('\n'))).toEqual({
      projectId: 'logix-react.local-counter',
      sourceRevision: '3',
      sourceDigest: 'playground-source:abc',
      operationKind: 'run',
      operationId: 'logix-react.local-counter:r3:txn3:op4',
    })
  })

  it('requires exact coordinate equality across faces', () => {
    const coordinate = parseEvidenceCoordinateText([
      'projectId=logix-react.local-counter',
      'sourceRevision=3',
      'sourceDigest=playground-source:abc',
      'operationKind=run',
      'operationId=logix-react.local-counter:r3:txn3:op4',
    ].join('\n'))

    expect(() => assertSameEvidenceCoordinate(coordinate, coordinate, 'same coordinate')).not.toThrow()
    expect(() => assertSameEvidenceCoordinate(coordinate, {
      ...coordinate,
      sourceDigest: 'playground-source:other',
    }, 'same coordinate')).toThrow(/same evidence coordinate/)
  })
})
