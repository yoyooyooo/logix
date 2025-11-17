import { describe, it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../src/index.js'

describe('Reflection.diffManifest', () => {
  it('should produce deterministic diff and verdicts (breaking/risky/info)', () => {
    const Base = Logix.Module.make('Reflection.DiffManifest', {
      state: Schema.Struct({ value: Schema.Number }),
      actions: { noop: Schema.Void },
      schemas: {
        Foo: Schema.String,
        Bar: Schema.Number,
      },
      meta: {
        owner: 'team-a',
      },
      dev: {
        source: { file: 'a.ts', line: 1, column: 1 },
      },
    })

    const before = Base.implement({
      initial: { value: 0 },
      logics: [Base.logic(() => Effect.void, { id: 'slot-a', kind: 'user', name: 'A' })],
    })

    const After = Logix.Module.make('Reflection.DiffManifest', {
      state: Schema.Struct({ value: Schema.Number }),
      actions: { noop: Schema.Void, newAction: Schema.Void },
      schemas: {
        Foo: Schema.String,
      },
      meta: {
        owner: 'team-b',
      },
      dev: {
        source: { file: 'b.ts', line: 2, column: 3 },
      },
    })

    const after = After.implement({
      initial: { value: 0 },
      logics: [After.logic(() => Effect.void, { id: 'slot-a', kind: 'user', name: 'A2' })],
    })

    const manifestBefore = Logix.Reflection.extractManifest(before)
    const manifestAfter = Logix.Reflection.extractManifest(after)

    const diff1 = Logix.Reflection.diffManifest(manifestBefore, manifestAfter)
    const diff2 = Logix.Reflection.diffManifest(manifestBefore, manifestAfter)

    expect(JSON.stringify(diff1)).toBe(JSON.stringify(diff2))
    expect(diff1.verdict).toBe('FAIL')

    // schemaKeys removal is breaking; meta change is risky; source change is info
    const severities = diff1.changes.map((c) => c.severity)
    expect(severities).toContain('BREAKING')
    expect(severities).toContain('RISKY')
    expect(severities).toContain('INFO')

    const breakingCodes = diff1.changes.filter((c) => c.severity === 'BREAKING').map((c) => c.code)
    expect(breakingCodes).toContain('schemaKeys.changed')
  })

  it('should support metaAllowlist to reduce noise', () => {
    const Root = Logix.Module.make('Reflection.DiffManifest.Allowlist', {
      state: Schema.Struct({ ok: Schema.Boolean }),
      actions: { noop: Schema.Void },
      meta: {
        owner: 'team-a',
        docs: 'a',
      },
    })

    const before = Root.implement({ initial: { ok: true }, logics: [] })
    const after = Logix.Module.make('Reflection.DiffManifest.Allowlist', {
      state: Schema.Struct({ ok: Schema.Boolean }),
      actions: { noop: Schema.Void },
      meta: {
        owner: 'team-b',
        docs: 'a',
      },
    }).implement({ initial: { ok: true }, logics: [] })

    const diff = Logix.Reflection.diffManifest(
      Logix.Reflection.extractManifest(before),
      Logix.Reflection.extractManifest(after),
      { metaAllowlist: ['docs'] },
    )

    expect(diff.verdict).toBe('PASS')
    expect(diff.changes.find((c) => c.code === 'meta.changed')).toBeUndefined()
  })
})
