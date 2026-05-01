import { describe, expect, it } from 'vitest'
import type { PlaygroundProjectServiceFiles } from '../../Project.js'
import {
  classifyServiceFileFailure,
  groupWorkspaceFilesByServiceRole,
  normalizeServiceFiles,
} from './serviceFiles.js'

const serviceFiles: PlaygroundProjectServiceFiles = [
  {
    id: 'search-client',
    label: 'Search client',
    files: [
      {
        path: 'src/services/search.service.ts',
        label: 'Search service',
        role: 'service-provider',
        serviceRef: 'SearchClient',
        schemaSummary: 'search(query: string)',
      },
      {
        path: '/src/fixtures/search.fixture.ts',
        label: 'Search fixture',
        role: 'fixture',
      },
    ],
  },
]

describe('serviceFiles', () => {
  it('normalizes service file metadata and validates referenced source files', () => {
    const normalized = normalizeServiceFiles(serviceFiles, new Set([
      '/src/services/search.service.ts',
      '/src/fixtures/search.fixture.ts',
    ]))

    expect(normalized[0]?.files.map((file) => file.path)).toEqual([
      '/src/services/search.service.ts',
      '/src/fixtures/search.fixture.ts',
    ])
  })

  it('rejects missing service source references', () => {
    expect(() => normalizeServiceFiles(serviceFiles, new Set(['/src/main.program.ts']))).toThrow(
      /Service file reference does not exist: \/src\/services\/search.service.ts/,
    )
  })

  it('projects workspace paths into service navigation groups', () => {
    const groups = groupWorkspaceFilesByServiceRole(
      [
        '/src/main.program.ts',
        '/src/services/search.service.ts',
        '/src/fixtures/search.fixture.ts',
      ],
      normalizeServiceFiles(serviceFiles, new Set([
        '/src/services/search.service.ts',
        '/src/fixtures/search.fixture.ts',
      ])),
    )

    expect(groups).toEqual([
      {
        id: 'runtime-source',
        label: 'Runtime source',
        paths: ['/src/main.program.ts'],
      },
      {
        id: 'search-client',
        label: 'Search client',
        paths: ['/src/services/search.service.ts', '/src/fixtures/search.fixture.ts'],
      },
    ])
  })

  it('classifies service source validation failures separately from runtime failures', () => {
    const failure = classifyServiceFileFailure(new Error('SearchClient is unavailable'))

    expect(failure).toMatchObject({
      kind: 'service-source',
      message: 'SearchClient is unavailable',
    })
  })
})
