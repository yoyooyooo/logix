import { describe, expect, it } from 'vitest'
import * as TestRootNS from '../../src/index.js'

describe('Test harness root surface contract', () => {
  it('should keep only TestProgram on package root', () => {
    const root = TestRootNS as Record<string, unknown>

    expect(Object.keys(root).sort()).toEqual(['TestProgram'])
    expect(root.TestProgram).toBeDefined()
    expect(typeof (root.TestProgram as any).runProgram).toBe('function')
    expect(typeof (root.TestProgram as any).runTest).toBe('function')

    expect('TestRuntime' in root).toBe(false)
    expect('Execution' in root).toBe(false)
    expect('Assertions' in root).toBe(false)
    expect('Vitest' in root).toBe(false)
    expect('Act' in root).toBe(false)
  })
})
