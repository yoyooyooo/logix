import { describe, expect, it } from 'vitest'

import {
  buildPublishedManifest,
  distTagForVersion,
  npmPackArgs,
  npmPublishArgs,
  publicPackages,
  rewriteWorkspaceDependencies,
  selectPackages,
} from './release-publish.mjs'

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

  it('publishes tarballs against the npmjs registry explicitly', () => {
    expect(npmPublishArgs('/tmp/logixjs-playground-1.0.2.tgz', 'latest')).toEqual([
      'publish',
      '/tmp/logixjs-playground-1.0.2.tgz',
      '--access',
      'public',
      '--tag',
      'latest',
      '--registry',
      'https://registry.npmjs.org',
    ])
  })

  it('includes playground after npm Trusted Publishing is configured', () => {
    expect(publicPackages().map(({ pkg }) => pkg.name)).toContain('@logixjs/playground')
  })

  it('filters a targeted bootstrap publish by package name', () => {
    const selected = selectPackages(publicPackages(), ['@logixjs/playground'])

    expect(selected.map(({ pkg }) => pkg.name)).toEqual(['@logixjs/playground'])
  })

  it('still rewrites workspace dependencies against the full publish set for targeted packages', () => {
    const manifest = rewriteWorkspaceDependencies(
      {
        name: '@logixjs/playground',
        dependencies: {
          '@logixjs/core': 'workspace:*',
          '@logixjs/react': 'workspace:*',
          '@logixjs/sandbox': 'workspace:*',
        },
      },
      ['@logixjs/core', '@logixjs/playground', '@logixjs/react', '@logixjs/sandbox'],
      '1.0.2',
    )

    expect(manifest.dependencies).toEqual({
      '@logixjs/core': '1.0.2',
      '@logixjs/react': '1.0.2',
      '@logixjs/sandbox': '1.0.2',
    })
  })
})
