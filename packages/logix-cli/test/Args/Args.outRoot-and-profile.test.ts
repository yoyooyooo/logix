import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { parseCliInvocation } from '../../src/internal/args.js'

describe('args: --outRoot / --profile token safety', () => {
  it('should derive outDir when --outRoot is provided', async () => {
    const outRoot = 'out-root'
    const parsed = await Effect.runPromise(
      parseCliInvocation(['trialrun', '--runId', 'r1', '--entry', 'x.ts#AppRoot', '--outRoot', outRoot], { helpText: 'help' }),
    )
    expect(parsed.kind).toBe('command')
    if (parsed.kind !== 'command') throw new Error('expected command')
    expect(parsed.command).toBe('trialrun')
    expect(parsed.global.outDir).toBe(path.join(outRoot, 'trialrun', 'r1'))
  })

  it('should prefer explicit --out over --outRoot', async () => {
    const parsed = parseCliInvocation(
      ['trialrun', '--runId', 'r1', '--entry', 'x.ts#AppRoot', '--outRoot', 'out-root', '--out', 'explicit-out'],
      { helpText: 'help' },
    )
    const parsed2 = await Effect.runPromise(parsed)
    expect(parsed2.kind).toBe('command')
    if (parsed2.kind !== 'command') throw new Error('expected command')
    expect(parsed2.global.outDir).toBe('explicit-out')
  })

  it('should derive outDir for dot commands (e.g. contract-suite.run)', async () => {
    const outRoot = 'out-root'
    const parsed = await Effect.runPromise(
      parseCliInvocation(
        ['contract-suite', 'run', '--runId', 'r1', '--entry', 'x.ts#AppRoot', '--outRoot', outRoot],
        { helpText: 'help' },
      ),
    )
    expect(parsed.kind).toBe('command')
    if (parsed.kind !== 'command') throw new Error('expected command')
    expect(parsed.command).toBe('contract-suite.run')
    expect(parsed.global.outDir).toBe(path.join(outRoot, 'contract-suite.run', 'r1'))
  })

  it('should not treat --profile value as command token', async () => {
    const parsed = await Effect.runPromise(
      parseCliInvocation(['--runId', 'r1', '--profile', 'ci', 'anchor', 'index'], { helpText: 'help' }),
    )
    expect(parsed.kind).toBe('command')
    if (parsed.kind !== 'command') throw new Error('expected command')
    expect(parsed.command).toBe('anchor.index')
  })
})
