import { describe, expect, it } from 'vitest'

import { buildPublishedManifest, distTagForVersion, npmPackArgs, publicPackages } from './release-publish.mjs'

describe('release-publish manifest helpers', () => {
  it('maps versions to npm dist-tags', () => {
    expect(distTagForVersion('1.2.3')).toBe('latest')
    expect(distTagForVersion('1.2.3-alpha.1')).toBe('alpha')
    expect(distTagForVersion('1.2.3-beta.2')).toBe('beta')
    expect(distTagForVersion('1.2.3-rc.3')).toBe('rc')
    expect(distTagForVersion('1.2.3-canary.20260513.abcd1234')).toBe('canary')
  })

  it('merges publishConfig into the published manifest', () => {
    const manifest = buildPublishedManifest(
      {
        name: '@logixjs/core',
        version: '1.0.2-beta.1',
        main: './src/index.ts',
        module: './src/index.ts',
        types: './src/index.ts',
        publishConfig: {
          main: './dist/index.cjs',
          module: './dist/index.js',
          types: './dist/index.d.ts',
          exports: {
            '.': {
              types: './dist/index.d.ts',
              import: './dist/index.js',
              require: './dist/index.cjs',
            },
          },
        },
      } as const,
      '1.0.2',
    )

    expect(manifest.version).toBe('1.0.2')
    expect(manifest.main).toBe('./dist/index.cjs')
    expect(manifest.module).toBe('./dist/index.js')
    expect(manifest.types).toBe('./dist/index.d.ts')
    expect(manifest.publishConfig.main).toBe('./dist/index.cjs')
    expect(manifest.publishConfig.exports['.'].import).toBe('./dist/index.js')
  })

  it('packs release tarballs without rerunning package prepack scripts after manifest staging', () => {
    expect(npmPackArgs('/tmp/logix-pack')).toEqual(['pack', '--ignore-scripts', '--pack-destination', '/tmp/logix-pack'])
  })

  it('does not publish package entries that are not configured on npm yet', () => {
    expect(publicPackages().map(({ pkg }) => pkg.name)).not.toContain('@logixjs/playground')
  })
})
