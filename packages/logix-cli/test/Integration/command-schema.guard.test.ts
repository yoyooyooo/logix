import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { CLI_COMMAND_SCHEMA } from '../../src/internal/commandSchema.js'

const packageRoot = fileURLToPath(new URL('../..', import.meta.url))
const schema = JSON.parse(fs.readFileSync(path.join(packageRoot, 'src/schema/commands.v1.json'), 'utf8'))

describe('CLI derived command schema artifact', () => {
  it('contains only final public commands and no archived discovery route', () => {
    expect(schema).toEqual(CLI_COMMAND_SCHEMA)
    expect(schema.kind).toBe('LogixCliCommandSchema')
    expect(schema.derivedMirror).toBe(true)
    expect(schema.authority).toContain('docs/ssot/runtime/15-cli-agent-first-control-plane.md')
    expect(schema.commands.map((command: any) => command.name)).toEqual(['check', 'trial', 'compare'])
    expect(JSON.stringify(schema)).not.toMatch(/describe|--describe-json|CliDescribeReport|contract-suite|transform|ir\.|trialrun|writeback/)
  })

  it('declares the CommandResult rerun and report-link contract', () => {
    expect(schema.commandResult.requiredFields).toContain('primaryReportOutputKey')
    expect(schema.commandResult.requiredFields).toContain('inputCoordinate')
    expect(schema.commandResult.inputCoordinateFields).toContain('argvSnapshot')
    expect(schema.commandResult.artifactFields).toEqual([
      'outputKey',
      'kind',
      'schemaVersion',
      'ok',
      'file',
      'inline',
      'truncated',
      'budgetBytes',
      'actualBytes',
      'digest',
      'reasonCodes',
      'error',
    ])
    expect(schema.commandResult.primaryReportArtifactKind).toBe('VerificationControlPlaneReport')
    expect(schema.exitCodes.map((x: any) => x.code)).toEqual([0, 1, 2])
  })
})
