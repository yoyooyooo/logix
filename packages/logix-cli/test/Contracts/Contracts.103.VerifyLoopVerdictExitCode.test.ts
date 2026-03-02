import { describe, expect, it } from 'vitest'

import { extractVerdictExitCodeMap, loadVerifyLoopReportSchema } from '../helpers/verifyLoopSchema.js'

describe('contracts 103 verify-loop verdict/exitCode mapping', () => {
  it('locks verdict and exitCode to deterministic pairs', async () => {
    const schema = await loadVerifyLoopReportSchema()
    const mapping = extractVerdictExitCodeMap(schema)

    expect(mapping).toEqual({
      PASS: 0,
      ERROR: 1,
      VIOLATION: 2,
      RETRYABLE: 3,
      NOT_IMPLEMENTED: 4,
      NO_PROGRESS: 5,
    })
  })
})
