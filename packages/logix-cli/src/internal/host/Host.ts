import type { CliHost } from '../args.js'

import { browserMockHost } from './browserMockHost.js'
import { nodeHost } from './nodeHost.js'

export type HostRestore = () => void | Promise<void>

export type HostAdapter = {
  readonly name: CliHost
  readonly install: () => HostRestore | Promise<HostRestore>
}

export const getHostAdapter = (host: CliHost): HostAdapter => {
  switch (host) {
    case 'node':
      return nodeHost
    case 'browser-mock':
      return browserMockHost
  }
}
