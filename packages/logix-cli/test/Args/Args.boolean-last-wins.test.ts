import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { parseCliInvocation } from '../../src/internal/args.js'

describe('args: boolean flags (last-wins)', () => {
  it('should support --noXxx overrides', async () => {
    const base = ['trialrun', '--runId', 'r1', '--entry', 'x.ts#AppRoot']

    const a = await Effect.runPromise(parseCliInvocation([...base, '--includeTrace'], { helpText: 'help' }))
    expect(a.kind).toBe('command')
    if (a.kind !== 'command') throw new Error('expected command')
    expect(a.command).toBe('trialrun')
    expect(a.includeTrace).toBe(true)

    const b = await Effect.runPromise(parseCliInvocation([...base, '--noIncludeTrace'], { helpText: 'help' }))
    expect(b.kind).toBe('command')
    if (b.kind !== 'command') throw new Error('expected command')
    expect(b.command).toBe('trialrun')
    expect(b.includeTrace).toBe(false)

    const c = await Effect.runPromise(parseCliInvocation([...base, '--includeTrace', '--noIncludeTrace'], { helpText: 'help' }))
    expect(c.kind).toBe('command')
    if (c.kind !== 'command') throw new Error('expected command')
    expect(c.command).toBe('trialrun')
    expect(c.includeTrace).toBe(false)

    const d = await Effect.runPromise(parseCliInvocation([...base, '--noIncludeTrace', '--includeTrace'], { helpText: 'help' }))
    expect(d.kind).toBe('command')
    if (d.kind !== 'command') throw new Error('expected command')
    expect(d.command).toBe('trialrun')
    expect(d.includeTrace).toBe(true)
  })

  it('should apply the same rule to other booleans', async () => {
    const base = ['contract-suite', 'run', '--runId', 'r1', '--entry', 'x.ts#AppRoot']

    const a = await Effect.runPromise(parseCliInvocation([...base, '--allowWarn'], { helpText: 'help' }))
    expect(a.kind).toBe('command')
    if (a.kind !== 'command') throw new Error('expected command')
    expect(a.command).toBe('contract-suite.run')
    expect(a.allowWarn).toBe(true)

    const b = await Effect.runPromise(parseCliInvocation([...base, '--allowWarn', '--noAllowWarn'], { helpText: 'help' }))
    expect(b.kind).toBe('command')
    if (b.kind !== 'command') throw new Error('expected command')
    expect(b.command).toBe('contract-suite.run')
    expect(b.allowWarn).toBe(false)

    const c = await Effect.runPromise(parseCliInvocation([...base, '--includeContextPack'], { helpText: 'help' }))
    expect(c.kind).toBe('command')
    if (c.kind !== 'command') throw new Error('expected command')
    expect(c.command).toBe('contract-suite.run')
    expect(c.includeContextPack).toBe(true)

    const d = await Effect.runPromise(parseCliInvocation([...base, '--noIncludeContextPack'], { helpText: 'help' }))
    expect(d.kind).toBe('command')
    if (d.kind !== 'command') throw new Error('expected command')
    expect(d.command).toBe('contract-suite.run')
    expect(d.includeContextPack).toBe(false)

    const e = await Effect.runPromise(
      parseCliInvocation(
        [...base, '--includeUiKitRegistry', '--requireRulesManifest', '--includeAnchorAutofill'],
        { helpText: 'help' },
      ),
    )
    expect(e.kind).toBe('command')
    if (e.kind !== 'command') throw new Error('expected command')
    expect(e.command).toBe('contract-suite.run')
    expect(e.includeUiKitRegistry).toBe(true)
    expect(e.requireRulesManifest).toBe(true)
    expect(e.includeAnchorAutofill).toBe(true)
  })
})
