import type { PlaygroundProjectServiceFiles } from '@logixjs/playground/Project'
import { serviceSourcePaths } from './files'

export const serviceSourceFileGroups: PlaygroundProjectServiceFiles = [
  {
    id: 'search-client',
    label: 'Search client',
    files: [
      {
        path: serviceSourcePaths.searchService,
        label: 'Search service',
        role: 'service-provider',
        serviceRef: 'SearchClient',
        schemaSummary: 'search(query: string) -> SearchResult[]',
      },
    ],
  },
]
