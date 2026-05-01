import { describe, expect, it } from 'vitest'
import {
  canCommitProgramSessionOperation,
  createInitialProgramSession,
  makeProgramSessionOperationRoot,
} from '../src/internal/session/programSession.js'

describe('Program session lifecycle commit predicate', () => {
  it('accepts only the current project revision session and operation sequence', () => {
    const session = createInitialProgramSession({
      projectId: 'logix-react.local-counter',
      revision: 1,
      seq: 2,
    })
    const root = makeProgramSessionOperationRoot(session, 1)

    expect(canCommitProgramSessionOperation(session, root)).toBe(true)
    expect(canCommitProgramSessionOperation(session, { ...root, projectId: 'other' })).toBe(false)
    expect(canCommitProgramSessionOperation(session, { ...root, revision: 0 })).toBe(false)
    expect(canCommitProgramSessionOperation(session, { ...root, sessionId: 'old-session' })).toBe(false)
    expect(canCommitProgramSessionOperation(session, { ...root, opSeq: 2 })).toBe(false)
  })
})
