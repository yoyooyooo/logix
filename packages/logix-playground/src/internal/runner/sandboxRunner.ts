import { Effect, Exit, Layer, Scope, ServiceMap } from 'effect'
import { SandboxClientLayer, SandboxClientTag } from '@logixjs/sandbox'
import { makeRunId } from '../snapshot/identity.js'
import type { ProjectSnapshot } from '../snapshot/projectSnapshot.js'
import { createProgramWrapperSource } from './programWrapper.js'
import { projectRunFailure, projectRunValue, type InternalRunResult } from './runProjection.js'

export interface InternalSandboxTransport {
  readonly init: () => Promise<void>
  readonly compile: (code: string, filename?: string) => Promise<{ readonly success: boolean; readonly errors?: ReadonlyArray<string> }>
  readonly run: (options: { readonly runId: string }) => Promise<{ readonly stateSnapshot?: unknown; readonly logs?: ReadonlyArray<unknown> }>
  readonly trial: (options: {
    readonly moduleCode: string
    readonly moduleExport?: string
    readonly runId: string
  }) => Promise<{ readonly stateSnapshot?: unknown }>
  readonly dispose?: () => Promise<void>
}

export interface PlaygroundRunnerOptions {
  readonly transport: InternalSandboxTransport
}

export const assertRunnerSnapshotBoundary = (snapshot: ProjectSnapshot): void => {
  if (!snapshot.programEntry) {
    throw new Error(`Project ${snapshot.projectId} has no Program entry`)
  }

  if (!snapshot.files.has(snapshot.programEntry.entry)) {
    throw new Error(`ProjectSnapshot missing Program entry file: ${snapshot.programEntry.entry}`)
  }
}

export const createDefaultSandboxTransport = (): InternalSandboxTransport => {
  let current:
    | {
        readonly scope: Scope.Scope
        readonly service: any
      }
    | undefined

  const getService = async (): Promise<any> => {
    if (current) return current.service

    const scope = Effect.runSync(Scope.make())
    const context = await Effect.runPromise(
      Layer.buildWithScope(SandboxClientLayer({ timeout: 30_000 }) as Layer.Layer<any, unknown, never>, scope),
    )
    const service = ServiceMap.get(context, SandboxClientTag as any)
    current = { scope, service }
    return service
  }

  const runEffect = async <A>(make: (service: any) => Effect.Effect<A, unknown, never>): Promise<A> => {
    const service = await getService()
    return Effect.runPromise(make(service))
  }

  return {
    init: () => runEffect((service) => service.init()),
    compile: (code, filename) => runEffect((service) => service.compile(code, filename)),
    run: (options) => runEffect((service) => service.run({ ...options, useCompiledCode: true })),
    trial: (options) => runEffect((service) => service.trial(options)),
    dispose: async () => {
      const previous = current
      current = undefined
      if (!previous) return

      await Effect.runPromise(previous.service.terminate())
      await Effect.runPromise(Scope.close(previous.scope, Exit.void))
    },
  }
}

export const createSandboxBackedRunner = ({ transport }: PlaygroundRunnerOptions) => {
  const runProgram = async (snapshot: ProjectSnapshot, seq = 1): Promise<InternalRunResult> => {
    assertRunnerSnapshotBoundary(snapshot)

    const runId = makeRunId(snapshot.projectId, snapshot.revision, 'run', seq)
    const wrapper = createProgramWrapperSource({ snapshot, kind: 'run' })

    await transport.init()
    const compiled = await transport.compile(wrapper, snapshot.programEntry?.entry)
    if (!compiled.success) {
      return projectRunFailure(runId, 'compile', new Error(compiled.errors?.join('\n') ?? 'compile failed'))
    }

    try {
      const result = await transport.run({ runId })
      return projectRunValue(runId, result.stateSnapshot)
    } catch (error) {
      return projectRunFailure(runId, 'runtime', error)
    } finally {
      await transport.dispose?.()
    }
  }

  return {
    runProgram,
  }
}
