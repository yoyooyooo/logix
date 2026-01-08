import { describe, it, expect } from 'vitest'
import * as CoreNg from '../src/index.js'

describe('@logixjs/core-ng (smoke)', () => {
  it('should expose coreNgKernelLayer', () => {
    expect(CoreNg.coreNgKernelLayer).toBeDefined()
    expect(typeof CoreNg.coreNgKernelLayer).toBe('function')
  })
})
