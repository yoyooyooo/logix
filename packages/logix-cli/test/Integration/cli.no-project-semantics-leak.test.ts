import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'

const PROJECT_SEMANTIC_PATTERN = /\b(feature|milestone|epic)\b/i

type SemanticLeak = {
  readonly path: string
  readonly value: string
}

const collectSemanticLeaks = (value: unknown, path: ReadonlyArray<string> = []): SemanticLeak[] => {
  if (path.includes('ext')) return []

  if (typeof value === 'string') {
    return PROJECT_SEMANTIC_PATTERN.test(value) ? [{ path: path.join('.'), value }] : []
  }

  if (Array.isArray(value)) {
    const leaks: SemanticLeak[] = []
    for (let i = 0; i < value.length; i++) {
      leaks.push(...collectSemanticLeaks(value[i], [...path, String(i)]))
    }
    return leaks
  }

  if (!value || typeof value !== 'object') return []

  const leaks: SemanticLeak[] = []
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const nextPath = [...path, key]
    if (!nextPath.includes('ext') && PROJECT_SEMANTIC_PATTERN.test(key)) {
      leaks.push({ path: nextPath.join('.'), value: key })
    }
    leaks.push(...collectSemanticLeaks(child, nextPath))
  }
  return leaks
}

describe('logix-cli integration (no project semantics leak)', () => {
  it('keeps feature/milestone/epic out of core runCli output', async () => {
    const out = await Effect.runPromise(runCli(['describe', '--runId', 'no-project-semantics-1', '--json']))

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')

    const leaks = collectSemanticLeaks(out.result)
    expect(leaks).toEqual([])
  })
})
