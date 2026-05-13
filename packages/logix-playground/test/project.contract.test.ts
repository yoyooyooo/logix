import { describe, expect, it } from 'vitest'
import {
  definePlaygroundProject,
  definePlaygroundRegistry,
  resolvePlaygroundProject,
} from '../src/Project.js'
import * as ProjectApi from '../src/Project.js'
import { normalizePlaygroundProject } from '../src/internal/project/project.js'

describe('PlaygroundProject contract', () => {
  it('accepts minimal Logic-first Program entries with fixed Program/main convention', () => {
    const project = definePlaygroundProject({
      id: 'logix-react.local-counter',
      files: {
        '/src/main.program.ts': {
          language: 'ts',
          content: 'export const Program = {}\nexport const main = () => undefined',
          editable: true,
        },
      },
      program: { entry: '/src/main.program.ts' },
      capabilities: { run: true, check: true, trialStartup: true },
      fixtures: {},
    })

    const normalized = normalizePlaygroundProject(project)

    expect(normalized.id).toBe('logix-react.local-counter')
    expect(normalized.preview).toBeUndefined()
    expect(normalized.program?.entry).toBe('/src/main.program.ts')
  })

  it('rejects invalid ids and missing entries', () => {
    expect(() =>
      normalizePlaygroundProject({
        id: 'Bad Id',
        files: {},
        preview: { entry: '/src/App.tsx' },
      }),
    ).toThrow(/id/i)
  })

  it('does not accept custom Program export names at runtime boundary', () => {
    expect(() =>
      normalizePlaygroundProject({
        id: 'logix-react.bad-program-export',
        files: {
          '/src/main.program.ts': {
            language: 'ts',
            content: 'export const CustomProgram = {}',
            editable: true,
          },
        },
        program: {
          entry: '/src/main.program.ts',
          // @ts-expect-error custom export names are forbidden in v1
          programExport: 'CustomProgram',
        },
      }),
    ).toThrow(/programExport|mainExport|fixed exports/)
  })

  it('resolves projects from array and record registries', () => {
    const project = definePlaygroundProject({
      id: 'logix-react.registry-proof',
      files: {
        '/src/App.tsx': { language: 'tsx', content: 'export default null', editable: true },
      },
      preview: { entry: '/src/App.tsx' },
    })

    expect(resolvePlaygroundProject(definePlaygroundRegistry([project]), project.id)).toBe(project)
    expect(resolvePlaygroundProject(definePlaygroundRegistry({ [project.id]: project }), project.id)).toBe(project)
    expect(resolvePlaygroundProject([project], 'missing')).toBeUndefined()
  })

  it('provides standard virtual source path helpers for project declarations', () => {
    const sourcePaths = (
      ProjectApi as typeof ProjectApi & {
        readonly playgroundProjectSourcePaths?: {
          readonly mainProgram: string
          readonly previewApp: string
          readonly logic: (stem: string) => string
          readonly service: (stem: string) => string
          readonly fixture: (stem: string) => string
        }
      }
    ).playgroundProjectSourcePaths

    expect(sourcePaths?.mainProgram).toBe('/src/main.program.ts')
    expect(sourcePaths?.previewApp).toBe('/src/preview/App.tsx')
    expect(sourcePaths?.logic('localCounter')).toBe('/src/logic/localCounter.logic.ts')
    expect(sourcePaths?.service('searchClient')).toBe('/src/services/searchClient.service.ts')
    expect(sourcePaths?.fixture('happyPath')).toBe('/src/fixtures/happyPath.fixture.ts')
    expect(() => sourcePaths?.logic('../escape')).toThrow(/Invalid Playground logic source name/)
  })

  it('accepts curated driver metadata without adding driver files to runtime sources', () => {
    const project = definePlaygroundProject({
      id: 'logix-react.driver-proof',
      files: {
        '/src/main.program.ts': {
          language: 'ts',
          content: 'export const Program = {}\nexport const main = () => undefined',
          editable: true,
        },
      },
      program: { entry: '/src/main.program.ts' },
      drivers: [
        {
          id: 'increase',
          label: 'Increase',
          operation: 'dispatch',
          actionTag: 'increment',
          payload: { kind: 'void' },
          examples: [{ id: 'default', label: 'Default' }],
          readAnchors: [{ id: 'counter', label: 'Counter', target: 'state' }],
        },
      ],
    })

    const normalized = normalizePlaygroundProject(project)

    expect(normalized.drivers?.[0]?.id).toBe('increase')
    expect(normalized.files['/src/drivers.ts']).toBeUndefined()
  })

  it('accepts scenario playback metadata without adding scenario files to runtime sources', () => {
    const project = definePlaygroundProject({
      id: 'logix-react.scenario-proof',
      files: {
        '/src/main.program.ts': {
          language: 'ts',
          content: 'export const Program = {}\nexport const main = () => undefined',
          editable: true,
        },
      },
      program: { entry: '/src/main.program.ts' },
      drivers: [
        {
          id: 'increase',
          label: 'Increase',
          operation: 'dispatch',
          actionTag: 'increment',
          payload: { kind: 'void' },
        },
      ],
      scenarios: [
        {
          id: 'counter-demo',
          label: 'Counter demo',
          steps: [
            { id: 'increase-once', kind: 'driver', driverId: 'increase' },
            { id: 'settle-runtime', kind: 'settle', timeoutMs: 500 },
            { id: 'expect-state', kind: 'expect', target: 'state', assertion: 'changed' },
          ],
        },
      ],
    })

    const normalized = normalizePlaygroundProject(project)

    expect(normalized.scenarios?.[0]?.id).toBe('counter-demo')
    expect(normalized.files['/src/scenarios.ts']).toBeUndefined()
  })

  it('accepts service source file metadata only when referenced files exist', () => {
    const project = definePlaygroundProject({
      id: 'logix-react.service-proof',
      files: {
        '/src/main.program.ts': {
          language: 'ts',
          content: 'export const Program = {}\nexport const main = () => undefined',
          editable: true,
        },
        '/src/services/search.service.ts': {
          language: 'ts',
          content: 'export const search = () => []',
          editable: true,
        },
      },
      program: { entry: '/src/main.program.ts' },
      serviceFiles: [
        {
          id: 'search-client',
          label: 'Search client',
          files: [
            {
              path: '/src/services/search.service.ts',
              label: 'Search service',
              role: 'service-provider',
              serviceRef: 'SearchClient',
              schemaSummary: 'search() -> SearchResult[]',
            },
          ],
        },
      ],
    })

    const normalized = normalizePlaygroundProject(project)

    expect(normalized.serviceFiles?.[0]?.files[0]?.path).toBe('/src/services/search.service.ts')
    expect(normalized.files['/src/services/search.service.ts']).toBeDefined()
  })

  it('rejects service source file metadata that points at missing files', () => {
    expect(() =>
      normalizePlaygroundProject({
        id: 'logix-react.service-missing-file',
        files: {
          '/src/main.program.ts': {
            language: 'ts',
            content: 'export const Program = {}\nexport const main = () => undefined',
            editable: true,
          },
        },
        program: { entry: '/src/main.program.ts' },
        serviceFiles: [
          {
            id: 'search-client',
            label: 'Search client',
            files: [{ path: '/src/services/search.service.ts', label: 'Search service', role: 'service-provider' }],
          },
        ],
      }),
    ).toThrow(/service file.*does not exist/i)
  })
})
