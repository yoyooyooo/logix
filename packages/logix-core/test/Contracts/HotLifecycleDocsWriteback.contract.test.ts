import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = resolve(import.meta.dirname, '../../../..')

const read = (path: string): string => readFileSync(resolve(repoRoot, path), 'utf8')

describe('hot lifecycle docs writeback', () => {
  it('records React owner, evidence, and control-plane closure laws', () => {
    const react = read('docs/ssot/runtime/10-react-host-projection-boundary.md')
    const verification = read('docs/ssot/runtime/09-verification-control-plane.md')
    const control = read('docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md')

    expect(react).toContain('Development Hot Lifecycle Law')
    expect(react).toContain('RuntimeProvider projects the current runtime')
    expect(verification).toContain('Hot lifecycle evidence')
    expect(verification).toContain('runtime.hot-lifecycle')
    expect(control).toContain('no new runtime.hmr')
  })

  it('updates user docs with one development HMR owner model', () => {
    const docs = [
      'apps/docs/content/docs/guide/advanced/scope-and-resource-lifetime.md',
      'apps/docs/content/docs/guide/advanced/scope-and-resource-lifetime.cn.md',
      'apps/docs/content/docs/guide/essentials/react-integration.md',
      'apps/docs/content/docs/guide/essentials/react-integration.cn.md',
      'apps/docs/content/docs/guide/recipes/react-integration.md',
      'apps/docs/content/docs/guide/recipes/react-integration.cn.md',
      'apps/docs/content/docs/guide/advanced/troubleshooting.md',
      'apps/docs/content/docs/guide/advanced/troubleshooting.cn.md',
    ]

    for (const path of docs) {
      const source = read(path)
      expect(source).toContain('RuntimeProvider')
      expect(source).toContain('reset')
      expect(source).toContain('dispose')
      expect(source).toContain('runtime.hot-lifecycle')
    }

    const englishDocs = docs.filter((path) => !path.endsWith('.cn.md')).map(read).join('\n')
    const chineseDocs = docs.filter((path) => path.endsWith('.cn.md')).map(read).join('\n')

    expect(englishDocs).toContain('logixReactDevLifecycle()')
    expect(englishDocs).toContain('installLogixDevLifecycleForVitest()')
    expect(englishDocs).toContain('host dev lifecycle carrier')
    expect(chineseDocs).toContain('logixReactDevLifecycle()')
    expect(chineseDocs).toContain('installLogixDevLifecycleForVitest()')
    expect(chineseDocs).toContain('dev lifecycle carrier')
  })
})
