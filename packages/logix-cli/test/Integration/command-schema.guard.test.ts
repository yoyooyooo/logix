import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { CLI_COMMAND_SCHEMA } from '../../src/internal/commandSchema.js'

const packageRoot = fileURLToPath(new URL('../..', import.meta.url))
const repoRoot = path.resolve(packageRoot, '../..')
const schema = JSON.parse(fs.readFileSync(path.join(packageRoot, 'src/schema/commands.v1.json'), 'utf8'))
const skillMirror = JSON.parse(fs.readFileSync(path.join(repoRoot, 'skills/logix-cli/references/commands.v1.json'), 'utf8'))

describe('CLI derived command schema artifact', () => {
  it('contains only final public commands and no archived discovery route', () => {
    expect(schema).toEqual(CLI_COMMAND_SCHEMA)
    expect(skillMirror).toEqual(schema)
    expect(schema.kind).toBe('LogixCliCommandSchema')
    expect(schema.derivedMirror).toBe(true)
    expect(schema.authority).toContain('docs/ssot/runtime/15-cli-agent-first-control-plane.md')
    expect(schema.commands.map((command: any) => command.name)).toEqual(['check', 'trial', 'compare', 'live'])
    expect(schema.commands.find((command: any) => command.name === 'live').runtimeStage).toBeNull()
    expect(schema.liveCommandResult.requiredFields).toContain('primaryLiveOutputKey')
    expect(JSON.stringify(schema)).not.toMatch(/describe|--describe-json|CliDescribeReport|contract-suite|transform|ir\.|trialrun|writeback/)
  })

  it('keeps package schema and skill mirror aligned on public command grammar', () => {
    const expectedCommands = [
      {
        name: 'check',
        runtimeStage: 'check',
        requiredInputs: ['runId', 'entry'],
        primaryReportOutputKey: 'checkReport',
      },
      {
        name: 'trial',
        runtimeStage: 'trial',
        requiredInputs: ['runId', 'entry'],
        primaryReportOutputKey: 'trialReport',
      },
      {
        name: 'compare',
        runtimeStage: 'compare',
        requiredInputs: ['runId', 'beforeReport', 'afterReport'],
        primaryReportOutputKey: 'compareReport',
      },
      {
        name: 'live',
        runtimeStage: null,
        requiredInputs: ['runId'],
        primaryLiveOutputKey: 'liveOutput',
      },
    ]

    for (const candidate of [schema, skillMirror]) {
      expect(candidate.commands).toHaveLength(expectedCommands.length)
      for (const expected of expectedCommands) {
        expect(candidate.commands.find((command: any) => command.name === expected.name)).toMatchObject(expected)
      }
      expect(candidate.commands.find((command: any) => command.name === 'live').optionalInputs).toEqual(
        expect.arrayContaining(['target', 'attachment', 'tree', 'path', 'field', 'cursor', 'kind', 'limit', 'from']),
      )
      expect(candidate.commands.find((command: any) => command.name === 'live').forbiddenInputs).toEqual(
        expect.arrayContaining(['entry', 'scenario', 'beforeReport', 'afterReport', 'beforeEvidence', 'afterEvidence']),
      )
    }
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

  it('declares live result consumption fields without verification report authority', () => {
    expect(schema.liveCommandResult.requiredFields).toEqual([
      'schemaVersion',
      'kind',
      'runId',
      'command',
      'ok',
      'inputCoordinate',
      'artifacts',
      'primaryLiveOutputKey',
    ])
    expect(schema.liveCommandResult.artifactFields).toEqual([
      'outputKey',
      'kind',
      'ok',
      'file',
      'inline',
      'digest',
      'reasonCodes',
    ])
    expect(schema.liveCommandResult.forbiddenFields).toEqual([
      'primaryReportOutputKey',
      'repairHints',
      'nextRecommendedStage',
      'verdict',
    ])
    expect(schema.liveCommandResult).not.toHaveProperty('primaryReportArtifactKind')
    expect(skillMirror.liveCommandResult).toEqual(schema.liveCommandResult)
  })
})
