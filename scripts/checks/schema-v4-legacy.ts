import fs from 'node:fs'
import path from 'node:path'

export type SchemaLegacyRuleId =
  | 'query-dynamic-union-helper'
  | 'schema-record-object-form'
  | 'schema-partial-legacy'
  | 'schema-pattern-legacy'
  | 'parse-result-tree-formatter'

export type SchemaLegacyViolation = {
  readonly rule: SchemaLegacyRuleId
  readonly file: string
  readonly line: number
  readonly snippet: string
}

type Rule = {
  readonly id: SchemaLegacyRuleId
  readonly description: string
  readonly appliesToFile: (file: string) => boolean
  readonly matchLine: (line: string) => boolean
}

type Options = {
  readonly roots?: ReadonlyArray<string>
}

const DEFAULT_ROOTS = [
  'packages/logix-core/src',
  'packages/logix-form/src',
  'packages/logix-query/src',
] as const

const rules: ReadonlyArray<Rule> = [
  {
    id: 'query-dynamic-union-helper',
    description:
      'Query refresh target schema should not use the legacy asUnionMembers + Schema.Union(...members) helper; prefer direct literal schema construction.',
    appliesToFile: (file) => file === 'packages/logix-query/src/Query.ts',
    matchLine: (line) => /\basUnionMembers\b|Schema\.Union\(\.\.\.asUnionMembers\(|Schema\.Union\(\.\.\.members\)/.test(line),
  },
  {
    id: 'schema-record-object-form',
    description: 'Schema.Record({ key, value }) legacy object form is forbidden in Stage 2 target modules.',
    appliesToFile: (file) => file.endsWith('.ts') || file.endsWith('.tsx'),
    matchLine: (line) => /Schema\.Record\s*\(\s*\{\s*key\s*:/.test(line),
  },
  {
    id: 'schema-partial-legacy',
    description: 'Schema.partial(...) legacy form is forbidden in Stage 2 target modules.',
    appliesToFile: (file) => file.endsWith('.ts') || file.endsWith('.tsx'),
    matchLine: (line) => /Schema\.partial\s*\(/.test(line),
  },
  {
    id: 'schema-pattern-legacy',
    description: 'Schema.pattern(...) legacy form is forbidden in Stage 2 target modules.',
    appliesToFile: (file) => file.endsWith('.ts') || file.endsWith('.tsx'),
    matchLine: (line) => /Schema\.pattern\s*\(/.test(line),
  },
  {
    id: 'parse-result-tree-formatter',
    description: 'ParseResult.TreeFormatter should be cleared from Stage 2 production paths.',
    appliesToFile: (file) => file.endsWith('.ts') || file.endsWith('.tsx'),
    matchLine: (line) => /ParseResult\.TreeFormatter/.test(line),
  },
]

const collectFiles = (input: ReadonlyArray<string>): ReadonlyArray<string> => {
  const files: string[] = []
  for (const entry of input) {
    if (!fs.existsSync(entry)) continue
    const stat = fs.statSync(entry)
    if (stat.isDirectory()) {
      for (const child of fs.readdirSync(entry)) {
        files.push(...collectFiles([path.join(entry, child)]))
      }
      continue
    }
    if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      files.push(entry)
    }
  }
  return files
}

export const collectSchemaV4LegacyViolations = (options: Options = {}): ReadonlyArray<SchemaLegacyViolation> => {
  const roots = options.roots ?? DEFAULT_ROOTS
  const files = collectFiles(roots)
  const violations: SchemaLegacyViolation[] = []

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf-8')
    const rel = path.relative(process.cwd(), file) || file
    const lines = text.split('\n')
    lines.forEach((line, index) => {
      for (const rule of rules) {
        if (!rule.appliesToFile(rel)) continue
        if (!rule.matchLine(line)) continue
        violations.push({
          rule: rule.id,
          file: rel,
          line: index + 1,
          snippet: line.trim(),
        })
      }
    })
  }

  return violations
}

const main = (): void => {
  const violations = collectSchemaV4LegacyViolations()
  if (violations.length === 0) return

  console.error('[schema-v4-legacy] Found legacy schema patterns in Stage 2 target modules:')
  for (const violation of violations) {
    const rule = rules.find((entry) => entry.id === violation.rule)
    console.error(`- [${violation.rule}] ${violation.file}:${violation.line}: ${violation.snippet}`)
    if (rule) {
      console.error(`  -> ${rule.description}`)
    }
  }
  process.exit(1)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
