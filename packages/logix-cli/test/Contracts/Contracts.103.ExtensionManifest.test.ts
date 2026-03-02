import { describe, expect, it } from 'vitest'

import { parseExtensionManifest } from '../../src/internal/extension-host/manifest.js'

const makeValidManifest = (): unknown => ({
  manifestVersion: 'ext.v1',
  extensionId: 'demo-policy',
  revision: 'r1',
  runtime: {
    apiVersion: 'v1',
    entry: './extension-entry.js',
    hooks: ['setup', 'onEvent'],
  },
  capabilities: {
    hostApis: ['emit-control-event'],
    net: false,
    fs: false,
  },
  limits: {
    timeoutMs: 500,
    maxCpuMs: 250,
    maxMemoryMb: 64,
    maxQueueSize: 4,
  },
})

const getErrorCode = (fn: () => unknown): string | undefined => {
  try {
    fn()
    return undefined
  } catch (error) {
    return (error as { code?: string }).code
  }
}

describe('contracts 103 extension manifest runtime checks', () => {
  it('fails fast when manifest is structurally invalid', () => {
    const code = getErrorCode(() =>
      parseExtensionManifest({
        manifestVersion: 'ext.v1',
        extensionId: 'demo-policy',
      }),
    )

    expect(code).toBe('EXT_MANIFEST_INVALID')
  })

  it('fails fast when runtime.apiVersion is incompatible', () => {
    const manifest = makeValidManifest() as Record<string, unknown>
    manifest.runtime = {
      apiVersion: 'v2',
      entry: './extension-entry.js',
    }

    const code = getErrorCode(() => parseExtensionManifest(manifest))
    expect(code).toBe('EXT_API_INCOMPATIBLE')
  })

  it('fails fast on unknown fields outside ext slot', () => {
    const rootUnknown = {
      ...(makeValidManifest() as Record<string, unknown>),
      unknownRootField: true,
    }
    const runtimeUnknown = {
      ...(makeValidManifest() as Record<string, unknown>),
      runtime: {
        apiVersion: 'v1',
        entry: './extension-entry.js',
        unknownRuntimeField: true,
      },
    }

    expect(getErrorCode(() => parseExtensionManifest(rootUnknown))).toBe('EXT_MANIFEST_INVALID')
    expect(getErrorCode(() => parseExtensionManifest(runtimeUnknown))).toBe('EXT_MANIFEST_INVALID')
  })

  it('allows arbitrary ext.* fields', () => {
    const manifest = {
      ...(makeValidManifest() as Record<string, unknown>),
      ext: {
        feature: 'roadmap',
        milestone: 3,
        nested: { epic: 'e1' },
      },
    }

    const parsed = parseExtensionManifest(manifest)
    expect(parsed.ext).toEqual({
      feature: 'roadmap',
      milestone: 3,
      nested: { epic: 'e1' },
    })
  })
})
