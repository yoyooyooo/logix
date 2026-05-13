import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import * as ReactLogix from '../../src/index.js'

describe('React selector public surface', () => {
  it('does not expose a public no-arg useSelector overload', () => {
    const source = readFileSync(
      resolve(__dirname, '../../src/internal/hooks/useSelector.ts'),
      'utf8',
    )

    expect(source).not.toMatch(/export function useSelector<[^>]+>\(\s*handle:[^,]+,?\s*\):/)
    expect(source).not.toContain('selector?: SelectorInput')
  })

  it('does not export selector-route debug or resilience markers from the public root', () => {
    for (const key of [
      'selectorInternalResilienceMarker',
      'SelectorInternalResilienceMarked',
      'SelectorRouteDecision',
      'SelectorQualityArtifact',
      'toSelectorQualityArtifact',
    ]) {
      expect(key in ReactLogix).toBe(false)
    }
  })
})
