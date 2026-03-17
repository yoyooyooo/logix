import fs from 'node:fs'
import path from 'node:path'

export type EffectV4MatrixViolation = {
  readonly file: string
  readonly section: string
  readonly dependency: string
  readonly version: string
}

type PackageJson = Record<string, unknown>

const WORKSPACE_DIRS = ['packages', 'apps', 'examples'] as const

const ALLOWED_STABLE_EFFECT_PACKAGES = new Set(['@effect/eslint-plugin', '@effect/language-service'])

const collectPackageJsonFiles = (): ReadonlyArray<string> => {
  const files = new Set<string>([
    'package.json',
    '.codex/skills/logix-perf-evidence/package.json',
    'docs/specs/runtime-logix/form/poc/package.json',
  ])

  for (const root of WORKSPACE_DIRS) {
    if (!fs.existsSync(root)) continue

    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const packageJson = path.join(root, entry.name, 'package.json')
      if (fs.existsSync(packageJson)) {
        files.add(packageJson)
      }
    }
  }

  return [...files].filter((file) => fs.existsSync(file)).sort()
}

const isLegacyEffectVersion = (dependency: string, version: string): boolean => {
  if (dependency === 'effect') {
    return /^\^?3\./.test(version)
  }

  if (dependency.startsWith('@effect/')) {
    if (ALLOWED_STABLE_EFFECT_PACKAGES.has(dependency)) {
      return false
    }
    return /^\^?0\./.test(version)
  }

  return false
}

const collectFromRecord = (
  file: string,
  section: string,
  record: unknown,
): ReadonlyArray<EffectV4MatrixViolation> => {
  if (record == null || typeof record !== 'object' || Array.isArray(record)) {
    return []
  }

  const violations: EffectV4MatrixViolation[] = []
  for (const [dependency, value] of Object.entries(record as Record<string, unknown>)) {
    if (typeof value !== 'string') continue
    if (!isLegacyEffectVersion(dependency, value)) continue
    violations.push({
      file,
      section,
      dependency,
      version: value,
    })
  }
  return violations
}

export const collectEffectV4MatrixViolations = (): ReadonlyArray<EffectV4MatrixViolation> => {
  const packageFiles = collectPackageJsonFiles()
  const violations: EffectV4MatrixViolation[] = []

  for (const file of packageFiles) {
    const pkg = JSON.parse(fs.readFileSync(file, 'utf-8')) as PackageJson
    const rel = path.relative(process.cwd(), file) || file

    violations.push(...collectFromRecord(rel, 'dependencies', pkg.dependencies))
    violations.push(...collectFromRecord(rel, 'devDependencies', pkg.devDependencies))
    violations.push(...collectFromRecord(rel, 'peerDependencies', pkg.peerDependencies))
    violations.push(...collectFromRecord(rel, 'optionalDependencies', pkg.optionalDependencies))

    const pnpmSection = pkg.pnpm
    if (pnpmSection != null && typeof pnpmSection === 'object' && !Array.isArray(pnpmSection)) {
      violations.push(
        ...collectFromRecord(rel, 'pnpm.overrides', (pnpmSection as Record<string, unknown>).overrides),
      )
    }
  }

  return violations
}

const main = (): void => {
  const violations = collectEffectV4MatrixViolations()
  if (violations.length === 0) return

  console.error('[effect-v4-matrix] Found legacy Effect dependency pins in workspace manifests:')
  for (const violation of violations) {
    console.error(`- ${violation.file} :: ${violation.section} :: ${violation.dependency} = ${violation.version}`)
  }
  process.exit(1)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
