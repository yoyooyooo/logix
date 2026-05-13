import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = resolve(__dirname, '../../../..')

const read = (path: string): string => readFileSync(resolve(repoRoot, path), 'utf8')

const walkFiles = (dir: string): ReadonlyArray<string> => {
  const abs = resolve(repoRoot, dir)
  const out: Array<string> = []
  for (const entry of readdirSync(abs)) {
    const full = resolve(abs, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      out.push(...walkFiles(relative(repoRoot, full)))
      continue
    }
    if (/\.(md|mdx|ts|tsx)$/.test(entry)) {
      out.push(relative(repoRoot, full))
    }
  }
  return out.sort()
}

const linesWith = (source: string, pattern: RegExp): ReadonlyArray<string> =>
  source
    .split(/\r?\n/)
    .map((line, index) => ({ line, index: index + 1 }))
    .filter(({ line }) => pattern.test(line))
    .map(({ line, index }) => `${index}: ${line}`)

const isPureMarkdownLinkLine = (hit: string): boolean => /^- \[[^\]]+\]\([^)]+\)$/.test(hit.replace(/^\d+:\s*/, '').trim())

describe('public residue text sweep', () => {
  it('keeps public recipes and examples on exact selector inputs and the single React host gate', () => {
    const publicRecipeFiles = [
      'packages/logix-react/README.md',
      'skills/logix-best-practices/references/agent-first-api-generation.md',
      'skills/logix-best-practices/references/logix-react-notes.md',
      'skills/logix-best-practices/references/llms/05-react-usage-basics.md',
      'skills/logix-best-practices/references/form-domain-playbook.md',
      'examples/logix-react/src/demos/DiShowcaseLayout.tsx',
      ...walkFiles('examples/logix-react/src/demos/form'),
    ]

    const forbiddenPublicTerms = [
      /useForm[A-Za-z]*/,
      /useField[A-Za-z]*/,
      /useCompanion/,
      /useFormSelector/,
      /@logixjs\/form\/react/,
      /Form\.Source/,
      /whole-state selector/i,
      /whole state selector/i,
      /runtime topic key/i,
    ]

    const violations: Array<string> = []
    for (const file of publicRecipeFiles) {
      const source = read(file)
      for (const pattern of forbiddenPublicTerms) {
        const hits = linesWith(source, pattern)
        if (hits.length > 0) {
          violations.push(`${file}\n${hits.join('\n')}`)
        }
      }
    }

    expect(violations).toEqual([])
  })

  it('classifies internal runtime nouns in SSoT instead of teaching them as authoring concepts', () => {
    const ssotFiles = [
      'docs/ssot/runtime/01-public-api-spine.md',
      'docs/ssot/runtime/02-hot-path-direction.md',
      'docs/ssot/runtime/06-form-field-kernel-boundary.md',
      'docs/ssot/runtime/10-react-host-projection-boundary.md',
      'docs/ssot/form/13-exact-surface-contract.md',
    ]

    const internalTerms = [
      /field-kernel/i,
      /ReadQuery/,
      /read-query/i,
      /selector graph/i,
      /dirty evidence/i,
      /runtime topic key/i,
    ]

    const allowedContext =
      /internal|not public|不进入 public|不属于 public|不构成 public|不要求用户|不成为 public|不占据默认|不额外抬升|不得把|只作为 label|只保留为内部|内部|不进入公开|不构成公开|不要求用户|不成为公开|不占 Form declaration owner|只作为底层 reflection|public docs.*不得/i

    const violations: Array<string> = []
    for (const file of ssotFiles) {
      const source = read(file)
      for (const pattern of internalTerms) {
        const hits = linesWith(source, pattern).filter((hit) => !isPureMarkdownLinkLine(hit) && !allowedContext.test(hit))
        if (hits.length > 0) {
          violations.push(`${file}\n${hits.join('\n')}`)
        }
      }
    }

    expect(violations).toEqual([])
  })

  it('records the public residue sweep note with allowlist rules', () => {
    const notePath = 'docs/next/public-residue-sweep-2026-05-11.md'
    expect(existsSync(resolve(repoRoot, notePath))).toBe(true)

    const source = read(notePath)
    expect(source).toContain('public recipe')
    expect(source).toContain('internal-only')
    expect(source).toContain('negative-only')
    expect(source).toContain('fieldValue')
    expect(source).toContain('useSelector(handle, selector)')
    expect(source).toContain('Playground is product witness')
  })
})
