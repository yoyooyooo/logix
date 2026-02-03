import type { CliHost } from '../args.js'
import type { HostAdapter, HostRestore } from './Host.js'

type GlobalKey = string

type SavedGlobal = {
  readonly key: GlobalKey
  readonly existed: boolean
  readonly descriptor?: PropertyDescriptor
}

const hasOwn = (obj: object, key: string): boolean => Object.prototype.hasOwnProperty.call(obj, key)

const captureGlobal = (key: GlobalKey): SavedGlobal => ({
  key,
  existed: hasOwn(globalThis, key),
  descriptor: hasOwn(globalThis, key) ? Object.getOwnPropertyDescriptor(globalThis, key) : undefined,
})

const setGlobal = (key: GlobalKey, value: unknown): void => {
  Object.defineProperty(globalThis, key, {
    configurable: true,
    writable: true,
    value,
  })
}

const restoreGlobal = (saved: SavedGlobal): void => {
  if (!saved.existed) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (globalThis as any)[saved.key]
    } catch {
      // ignore
    }
    return
  }
  try {
    if (saved.descriptor) Object.defineProperty(globalThis, saved.key, saved.descriptor)
  } catch {
    // ignore
  }
}

const createBrowserMockHostRestore = (saved: ReadonlyArray<SavedGlobal>): HostRestore => {
  return () => {
    for (const s of saved) restoreGlobal(s)
  }
}

const installBrowserMockHost = async (): Promise<HostRestore> => {
  // Lazy-load: keep cold path fast.
  const { Window } = (await import('happy-dom')) as unknown as { readonly Window: new () => any }

  const window = new Window()

  const globalsToOverwrite: GlobalKey[] = [
    'window',
    'document',
    'navigator',
    'location',
    'self',
    // Common DOM constructors that some libs access as globals (best-effort).
    'Node',
    'Element',
    'HTMLElement',
    'Event',
    'CustomEvent',
    'EventTarget',
  ]

  const saved = globalsToOverwrite.map(captureGlobal)

  setGlobal('window', window)
  setGlobal('document', window.document)
  setGlobal('navigator', window.navigator)
  setGlobal('location', window.location)
  setGlobal('self', window)

  for (const key of globalsToOverwrite) {
    if (key in window) setGlobal(key, window[key])
  }

  return createBrowserMockHostRestore(saved)
}

export const browserMockHost: HostAdapter = {
  name: 'browser-mock' satisfies CliHost,
  install: installBrowserMockHost,
}

