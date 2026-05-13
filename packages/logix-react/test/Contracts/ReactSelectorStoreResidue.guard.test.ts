import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('React selector store residue guard', () => {
  it('keeps useSelector on RuntimeStore read-query topics and removes the legacy selector store', () => {
    const srcRoot = resolve(__dirname, '../../src')
    const useSelectorSource = readFileSync(resolve(srcRoot, 'internal/hooks/useSelector.ts'), 'utf8')
    const runtimeExternalStoreSource = readFileSync(resolve(srcRoot, 'internal/store/RuntimeExternalStore.ts'), 'utf8')

    expect(useSelectorSource).toContain('getRuntimeReadQueryExternalStore')
    expect(useSelectorSource).not.toContain('getModuleRuntimeSelectorExternalStore')

    expect(runtimeExternalStoreSource).toContain('retainReadQueryTopic')
    expect(runtimeExternalStoreSource).not.toContain('Stream.runDrain')
    expect(runtimeExternalStoreSource).not.toContain('changesReadQueryWithMeta(selectorReadQuery)')

    expect(existsSync(resolve(srcRoot, 'internal/store/ModuleRuntimeSelectorExternalStore.ts'))).toBe(false)
  })
})
