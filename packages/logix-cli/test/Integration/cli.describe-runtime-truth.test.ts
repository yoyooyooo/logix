import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { runCli } from '../../src/Commands.js'
import { COMMAND_REGISTRY } from '../../src/internal/commandRegistry.js'

describe('logix-cli integration (describe runtime truth)', () => {
  it('projects executable commands from registry truth and excludes unavailable commands', async () => {
    const out = await Effect.runPromise(runCli(['describe', '--runId', 'describe-runtime-truth-1', '--json']))

    expect(out.kind).toBe('result')
    if (out.kind !== 'result') throw new Error('expected result')
    expect(out.exitCode).toBe(0)
    expect(out.result.ok).toBe(true)

    const describeArtifact = out.result.artifacts.find((artifact) => artifact.outputKey === 'describeReport')
    expect(describeArtifact).toBeDefined()

    const report = describeArtifact?.inline as any
    const projectedCommandNames: string[] = Array.isArray(report?.commands)
      ? report.commands.map((command: any) => command.name).sort()
      : []

    const executableRegistryCommands = COMMAND_REGISTRY.filter(
      (entry) => entry.availability === 'available' && entry.visibility === 'primary',
    ).map((entry) => entry.command)
    const migrationRegistryCommands = COMMAND_REGISTRY.filter(
      (entry) => entry.availability === 'available' && entry.visibility === 'migration',
    ).map((entry) => entry.command)
    const unavailableRegistryCommands = COMMAND_REGISTRY.filter((entry) => entry.availability === 'unavailable').map(
      (entry) => entry.command,
    )
    const executableCommandNames = report?.runtimeExecutableTruth?.executableCommandNames ?? []
    const migrationCommandNames = report?.runtimeExecutableTruth?.migrationCommandNames ?? []
    const unavailableCommandNames = report?.runtimeExecutableTruth?.unavailableCommandNames ?? []
    const guidanceChains: ReadonlyArray<{ readonly primitiveChain?: ReadonlyArray<string> }> = Array.isArray(
      report?.agentGuidance?.verificationChains,
    )
      ? report.agentGuidance.verificationChains
      : []
    const executableOutputKeys = new Set(
      COMMAND_REGISTRY.filter((entry) => entry.availability === 'available' && entry.visibility === 'primary').flatMap((entry) =>
        entry.contract.outputs.map((output) => output.outputKey),
      ),
    )
    const executableArtifactFiles = new Set(
      COMMAND_REGISTRY.filter((entry) => entry.availability === 'available' && entry.visibility === 'primary').flatMap((entry) =>
        entry.contract.outputs
          .map((output) => output.defaultArtifactFileName)
          .filter((fileName): fileName is string => typeof fileName === 'string' && fileName.length > 0),
      ),
    )

    expect(report?.runtimeExecutableTruth?.source).toBe('command-registry.availability')
    expect([...executableCommandNames].sort()).toEqual([...executableRegistryCommands].sort())
    expect([...migrationCommandNames].sort()).toEqual([...migrationRegistryCommands].sort())
    expect([...unavailableCommandNames].sort()).toEqual([...unavailableRegistryCommands].sort())
    expect(projectedCommandNames).toEqual([...executableRegistryCommands].sort())
    expect(guidanceChains.length).toBeGreaterThan(0)

    for (const chain of guidanceChains) {
      const primitives = Array.isArray(chain.primitiveChain) ? chain.primitiveChain : []
      const outputKeys = Array.isArray((chain as any).expectedOutputKeys) ? ((chain as any).expectedOutputKeys as string[]) : []
      const artifacts = Array.isArray((chain as any).expectedArtifacts) ? ((chain as any).expectedArtifacts as string[]) : []
      expect(primitives.length).toBeGreaterThan(0)
      expect(primitives[0]).toBe('describe')
      expect(new Set(primitives).size).toBe(primitives.length)
      expect(outputKeys.length).toBeGreaterThan(0)
      expect(artifacts.length).toBeGreaterThan(0)
      for (const command of primitives) {
        expect(executableCommandNames).toContain(command)
      }
      for (const outputKey of outputKeys) {
        expect(executableOutputKeys.has(outputKey)).toBe(true)
      }
      for (const artifact of artifacts) {
        expect(executableArtifactFiles.has(artifact)).toBe(true)
      }
    }

    for (const unavailableCommand of unavailableRegistryCommands) {
      expect(projectedCommandNames).not.toContain(unavailableCommand)
    }
  })
})
