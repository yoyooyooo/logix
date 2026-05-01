import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolvePlaygroundProject } from '@logixjs/playground/Project'
import {
  assertProofRecipeCoverage,
  logixReactPlaygroundProofRecipes,
} from './browser/playground-proof-recipes'
import {
  logixReactDefaultPlaygroundProjectId,
  logixReactPlaygroundProjectIndex,
  logixReactPlaygroundRegistry,
} from '../src/playground/registry'

const testDirectory = dirname(fileURLToPath(import.meta.url))
const newProjectDirectory = resolve(testDirectory, '../src/playground/projects/new-project')
const localCounterProjectDirectory = resolve(testDirectory, '../src/playground/projects/local-counter')
const readNewProjectSource = (relativePath: string) =>
  readFileSync(resolve(newProjectDirectory, relativePath), 'utf8')
const readLocalCounterSource = (relativePath: string) =>
  readFileSync(resolve(localCounterProjectDirectory, relativePath), 'utf8')

describe('logix-react Playground registry', () => {
  it('registers new project as the first default preset with a minimal editable Program', () => {
    const project = resolvePlaygroundProject(logixReactPlaygroundRegistry, 'logix-react.new-project')

    expect(logixReactDefaultPlaygroundProjectId).toBe('logix-react.new-project')
    expect(logixReactPlaygroundRegistry[0]?.id).toBe('logix-react.new-project')
    expect(project?.id).toBe('logix-react.new-project')
    expect(project?.preview).toBeUndefined()
    expect(project?.program?.entry).toBe('/src/main.program.ts')
    expect(project?.capabilities).toEqual({
      run: true,
      check: true,
      trialStartup: true,
    })
    expect(project?.files['/src/main.program.ts']).toMatchObject({
      language: 'ts',
      editable: true,
      content: readNewProjectSource('sources/src/main.program.ts'),
    })
  })

  it('registers local counter as Logic-first with fixed Program/main entry', () => {
    const project = resolvePlaygroundProject(logixReactPlaygroundRegistry, 'logix-react.local-counter')

    expect(project?.id).toBe('logix-react.local-counter')
    expect(project?.preview).toBeUndefined()
    expect(project?.program?.entry).toBe('/src/main.program.ts')
    expect(project?.files['/src/logic/localCounter.logic.ts']?.content).toContain('counterStep = 1')
    expect(project?.files['/src/main.program.ts']?.content).toContain('export const Program')
    expect(project?.files['/src/main.program.ts']?.content).toContain('export const main')
    expect(project?.files['/src/main.program.ts']?.content).toContain('increment: Schema.Void')
    expect(project?.files['/src/main.program.ts']?.content).toContain('decrement: Schema.Void')
    expect(JSON.stringify(project)).not.toContain('programExport')
    expect(JSON.stringify(project)).not.toContain('mainExport')
  })

  it('exposes generated-index-ready project authority for docs consumers', () => {
    const fromRegistry = resolvePlaygroundProject(logixReactPlaygroundRegistry, 'logix-react.local-counter')
    const fromIndex = logixReactPlaygroundProjectIndex['logix-react.local-counter']

    expect(fromIndex).toBe(fromRegistry)
    expect(Object.keys(logixReactPlaygroundProjectIndex)).toContain('logix-react.local-counter')
  })

  it('keeps future docs integration on the same project object', () => {
    const docsProject = resolvePlaygroundProject(logixReactPlaygroundRegistry, 'logix-react.local-counter')
    const exampleProject = docsProject
      ? resolvePlaygroundProject(logixReactPlaygroundRegistry, docsProject.id)
      : undefined

    expect(docsProject).toBe(exampleProject)
    expect(docsProject?.fixtures).toEqual({ exampleRoute: '/local-program' })
  })

  it('maps local counter virtual files from author-side source files', () => {
    const project = resolvePlaygroundProject(logixReactPlaygroundRegistry, 'logix-react.local-counter')

    expect(project?.files['/src/logic/localCounter.logic.ts']?.content).toBe(
      readLocalCounterSource('sources/src/logic/localCounter.logic.ts'),
    )
    expect(project?.files['/src/main.program.ts']?.content).toBe(
      readLocalCounterSource('sources/src/main.program.ts'),
    )
  })

  it('keeps local counter curated drivers in project metadata instead of virtual source files', () => {
    const project = resolvePlaygroundProject(logixReactPlaygroundRegistry, 'logix-react.local-counter')

    expect(project?.drivers?.map((driver) => driver.id)).toEqual(['increase'])
    expect(project?.drivers?.[0]).toMatchObject({
      label: 'Increase',
      operation: 'dispatch',
      actionTag: 'increment',
      payload: { kind: 'void' },
    })
    expect(project?.files['/src/drivers.ts']).toBeUndefined()
  })

  it('keeps local counter scenarios in project metadata instead of virtual source files', () => {
    const project = resolvePlaygroundProject(logixReactPlaygroundRegistry, 'logix-react.local-counter')

    expect(project?.scenarios?.map((scenario) => scenario.id)).toEqual(['counter-demo'])
    expect(project?.scenarios?.[0]).toMatchObject({
      label: 'Counter demo',
      steps: [
        { id: 'increase-once', kind: 'driver', driverId: 'increase' },
        { id: 'settle-runtime', kind: 'settle', timeoutMs: 1000 },
        { id: 'expect-state', kind: 'expect', target: 'state', assertion: 'changed' },
      ],
    })
    expect(project?.files['/src/scenarios.ts']).toBeUndefined()
  })

  it('registers UI pressure fixture projects for the 166 browser contract', () => {
    const expectedPressure = [
      ['logix-react.pressure.action-dense', 'action-dense', 'actions', 74],
      ['logix-react.pressure.state-large', 'state-large', 'stateNodes', 420],
      ['logix-react.pressure.trace-heavy', 'trace-heavy', 'traceEvents', 1200],
      ['logix-react.pressure.diagnostics-dense', 'diagnostics-dense', 'realAuthorities', 2],
      ['logix-react.pressure.scenario-driver-payload', 'scenario-driver-payload', 'payloadBytes', 8500],
    ] as const
    const expectedDiagnosticsProjects = [
      'logix-react.diagnostics.check-imports',
      'logix-react.diagnostics.trial-missing-config',
      'logix-react.diagnostics.trial-missing-service',
      'logix-react.diagnostics.trial-missing-import',
      'logix-react.diagnostics.run-null-value',
      'logix-react.diagnostics.run-undefined-value',
      'logix-react.diagnostics.run-failure',
      'logix-react.diagnostics.payload-validator-unavailable',
      'logix-react.diagnostics.reflection-action-gap',
    ] as const

    expect(Object.keys(logixReactPlaygroundProjectIndex)).toEqual([
      'logix-react.new-project',
      'logix-react.local-counter',
      ...expectedPressure.map(([projectId]) => projectId),
      ...expectedDiagnosticsProjects,
      'logix-react.service-source',
    ])

    for (const [projectId, pressureId, metric, minimum] of expectedPressure) {
      const project = resolvePlaygroundProject(logixReactPlaygroundRegistry, projectId)
      const pressure = project?.fixtures && typeof project.fixtures === 'object' && 'pressure' in project.fixtures
        ? project.fixtures.pressure as {
            readonly id: string
            readonly authorityClass?: string
            readonly routeSuggestion: string
            readonly dataProfile: Readonly<Record<string, number>>
          }
        : undefined

      expect(project?.program?.entry).toBe('/src/main.program.ts')
      expect(project?.preview).toBeUndefined()
      expect(project?.files['/src/main.program.ts']?.content).toContain('export const Program')
      expect(project?.files['/src/main.program.ts']?.content).toContain('import { pressureActions } from "./actions"')
      expect(project?.files['/src/main.program.ts']?.content).toContain('actions: pressureActions')
      expect(project?.files['/src/main.program.ts']?.content).not.toContain('action01: Schema.Void')
      expect(project?.files['/src/actions.ts']?.content).toContain('action01: PressureSchema.Void')
      expect(pressure?.id).toBe(pressureId)
      expect(pressure?.authorityClass).toBe('visual-pressure-only')
      expect(pressure?.routeSuggestion).toBe(`/playground/${projectId}`)
      expect(pressure?.dataProfile[metric]).toBeGreaterThanOrEqual(minimum)
    }

    for (const projectId of expectedDiagnosticsProjects) {
      const project = resolvePlaygroundProject(logixReactPlaygroundRegistry, projectId)
      const diagnosticsDemo = project?.fixtures && typeof project.fixtures === 'object' && 'diagnosticsDemo' in project.fixtures
        ? project.fixtures.diagnosticsDemo as {
            readonly authorityClass?: string
            readonly expectedCodes: ReadonlyArray<string>
          }
        : undefined

      expect(project?.program?.entry).toBe('/src/main.program.ts')
      expect(project?.preview).toBeUndefined()
      expect(project?.capabilities?.check).toBe(true)
      expect(project?.capabilities?.trialStartup).toBe(true)
      expect(project?.files['/src/main.program.ts']?.content).toContain('export const Program')
      expect(project?.files['/src/main.program.ts']?.content).toContain('export const main')
      expect(diagnosticsDemo?.expectedCodes.length).toBeGreaterThan(0)
      expect(diagnosticsDemo?.authorityClass).toMatch(/^(runtime-|reflection-|workbench-|payload-validation)/)
    }
  })

  it('keeps every registered Playground project covered by a dogfood proof recipe', () => {
    expect(() => assertProofRecipeCoverage(
      logixReactPlaygroundRegistry,
      logixReactPlaygroundProofRecipes,
    )).not.toThrow()
  })

  it('keeps dogfood proof recipes from becoming second project metadata', () => {
    const forbiddenKeys = [
      'route',
      'requiredFiles',
      'expectedInitialTabs',
      'requiredRegions',
      'runtimeChecks',
      'visualPressureChecks',
    ]

    for (const recipe of Object.values(logixReactPlaygroundProofRecipes)) {
      for (const key of forbiddenKeys) {
        expect(Object.prototype.hasOwnProperty.call(recipe, key)).toBe(false)
      }
    }
  })

  it('registers service-source project with service source files as editable runtime files', () => {
    const project = resolvePlaygroundProject(logixReactPlaygroundRegistry, 'logix-react.service-source')

    expect(project?.program?.entry).toBe('/src/main.program.ts')
    expect(project?.preview).toBeUndefined()
    expect(project?.files['/src/services/search.service.ts']?.editable).toBe(true)
    expect(project?.serviceFiles?.[0]).toMatchObject({
      id: 'search-client',
      label: 'Search client',
      files: [
        {
          path: '/src/services/search.service.ts',
          role: 'service-provider',
          serviceRef: 'SearchClient',
        },
      ],
    })
  })
})
