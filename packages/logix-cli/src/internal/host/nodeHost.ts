import type { HostAdapter } from './Host.js'

export const nodeHost: HostAdapter = {
  name: 'node',
  install: () => () => {},
}

