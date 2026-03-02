import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { parseCliInvocation } from '../../src/internal/args.js'
import { resolveCliConfigArgvPrefix, resolveCliConfigArgvPrefixResolution } from '../../src/internal/cliConfig.js'

describe('args: logix.cli.json argv prefix', () => {
  it('should merge defaults + profile and allow argv overrides (last-wins)', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'logix-cli-config-prefix-'))
    try {
      const configFile = path.join(tmp, 'logix.cli.json')

      await fs.writeFile(
        configFile,
        JSON.stringify(
          {
            schemaVersion: 1,
            defaults: { diagnosticsLevel: 'off', includeTrace: true },
            profiles: { ci: { diagnosticsLevel: 'full', includeTrace: false } },
          },
          null,
          2,
        ),
        'utf8',
      )

      const argv = [
        'trialrun',
        '--runId',
        'r1',
        '--cliConfig',
        configFile,
        '--profile',
        'ci',
        '--entry',
        'x.ts#AppRoot',
        '--includeTrace',
      ]
      const resolved = await Effect.runPromise(resolveCliConfigArgvPrefixResolution(argv))
      const prefix = await Effect.runPromise(resolveCliConfigArgvPrefix(argv))
      const argv2 = [...prefix, ...argv]

      expect(resolved.profile).toBe('ci')
      expect(resolved.discovery.found).toBe(true)
      expect(resolved.layers.map((layer) => layer.source)).toEqual(['defaults', 'profile'])
      expect(resolved.layers[0]?.tokens).toContain('--diagnosticsLevel')
      expect(resolved.layers[1]?.tokens).toContain('--diagnosticsLevel')

      const parsed = await Effect.runPromise(parseCliInvocation(argv2, { helpText: 'help' }))
      expect(parsed.kind).toBe('command')
      if (parsed.kind !== 'command') throw new Error('expected command')
      expect(parsed.command).toBe('trialrun')
      if (parsed.command !== 'trialrun') throw new Error('expected trialrun command')
      expect(parsed.diagnosticsLevel).toBe('full')
      expect(parsed.includeTrace).toBe(true)
    } finally {
      await fs.rm(tmp, { recursive: true, force: true })
    }
  })

  it('should treat --host as value-bearing option during argv normalization', async () => {
    const parsed = await Effect.runPromise(parseCliInvocation([
      '--host',
      'browser-mock',
      'trialrun',
      '--runId',
      'r-host',
      '--entry',
      'x.ts#AppRoot',
    ], { helpText: 'help' }))

    expect(parsed.kind).toBe('command')
    if (parsed.kind !== 'command') throw new Error('expected command')
    expect(parsed.command).toBe('trialrun')
    if (parsed.command !== 'trialrun') throw new Error('expected trialrun command')
    expect(parsed.global.host).toBe('browser-mock')
  })

  it('should accept --with-anchors alias for ir export', async () => {
    const parsed = await Effect.runPromise(parseCliInvocation([
      'ir',
      'export',
      '--runId',
      'r-with-anchors',
      '--entry',
      'x.ts#AppRoot',
      '--with-anchors',
    ], { helpText: 'help' }))

    expect(parsed.kind).toBe('command')
    if (parsed.kind !== 'command') throw new Error('expected command')
    expect(parsed.command).toBe('ir.export')
    if (parsed.command !== 'ir.export') throw new Error('expected ir.export command')
    expect(parsed.withAnchors).toBe(true)
  })
})
