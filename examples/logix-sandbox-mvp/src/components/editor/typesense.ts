import type * as MonacoTypes from 'monaco-editor'
import type { MonacoTypeBundleMeta } from './types/monacoTypeBundle'

export type TypeSenseStatus =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly typeSenseReadyMs: number; readonly meta?: MonacoTypeBundleMeta }
  | { readonly status: 'error'; readonly error: string; readonly suggestion?: string }

let installPromise: Promise<{ readonly meta?: MonacoTypeBundleMeta }> | null = null

export const ensureTypeSenseInstalled = async (
  monaco: typeof MonacoTypes,
): Promise<{ readonly meta?: MonacoTypeBundleMeta }> => {
  if (installPromise) return await installPromise

  installPromise = (async () => {
    const { ensureMonacoWorkers } = await import('./monacoWorkers')
    ensureMonacoWorkers()

    const tsDefaults = monaco.typescript?.typescriptDefaults
    if (tsDefaults) {
      tsDefaults.setEagerModelSync(true)
      tsDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
        noSuggestionDiagnostics: false,
      })
    }

    let meta: MonacoTypeBundleMeta | undefined = undefined
    try {
      const m = await import('./types/monacoTypeBundle.generated.meta')
      meta = (m as any).monacoTypeBundleMeta as MonacoTypeBundleMeta
    } catch {
      // ignore
    }

    return { meta }
  })()

  return await installPromise
}
