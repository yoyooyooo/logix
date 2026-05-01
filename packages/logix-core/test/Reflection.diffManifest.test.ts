import * as CoreReflection from '@logixjs/core/repo-internal/reflection-api'
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

    const before = Logix.Program.make(Base, {
      initial: { value: 0 },
      logics: [Base.logic('slot-a', () => Effect.void, { kind: 'user', name: 'A' })],
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

    const after = Logix.Program.make(After, {
      initial: { value: 0 },
      logics: [After.logic('slot-a', () => Effect.void, { kind: 'user', name: 'A2' })],
    })

    const manifestBefore = CoreReflection.extractManifest(before)
    const manifestAfter = CoreReflection.extractManifest(after)

    const diff1 = CoreReflection.diffManifest(manifestBefore, manifestAfter)
    const diff2 = CoreReflection.diffManifest(manifestBefore, manifestAfter)

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

    const before = Logix.Program.make(Root, { initial: { ok: true }, logics: [] })
    const after = Logix.Program.make(Logix.Module.make('Reflection.DiffManifest.Allowlist', {
      state: Schema.Struct({ ok: Schema.Boolean }),
      actions: { noop: Schema.Void },
      meta: {
        owner: 'team-b',
        docs: 'a',
      },
    }), { initial: { ok: true }, logics: [] })

    const diff = CoreReflection.diffManifest(
      CoreReflection.extractManifest(before),
      CoreReflection.extractManifest(after),
      { metaAllowlist: ['docs'] },
    )

    expect(diff.verdict).toBe('PASS')
    expect(diff.changes.find((c) => c.code === 'meta.changed')).toBeUndefined()
  })
})
