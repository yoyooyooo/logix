export type AssemblyStageId =
  | 'validate.modules'
  | 'validate.tags'
  | 'build.baseLayer'
  | 'build.baseEnv'
  | 'build.moduleEnvs'
  | 'merge.env'
  | 'rootContext.merge'
  | 'rootContext.ready'
  | 'process.install'

export type AssemblyStageStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped'

export type AssemblyReasonCode =
  | 'boot::module_duplicate'
  | 'boot::tag_collision'
  | 'boot::base_layer_build_failed'
  | 'boot::module_layer_build_failed'
  | 'boot::env_merge_failed'
  | 'boot::root_context_merge_failed'
  | 'boot::root_context_ready_failed'
  | 'boot::process_install_failed'
  | 'boot::unknown'

interface AssemblyStageDefinition {
  readonly stageId: AssemblyStageId
  readonly dependsOn: ReadonlyArray<AssemblyStageId>
}

export interface AppAssemblyGraphNode {
  readonly stageId: AssemblyStageId
  readonly stageSeq: number
  readonly dependsOn: ReadonlyArray<AssemblyStageId>
  readonly status: AssemblyStageStatus
  readonly durationMs?: number
  readonly reasonCode?: AssemblyReasonCode
  readonly message?: string
}

interface MutableAppAssemblyGraphNode {
  stageId: AssemblyStageId
  stageSeq: number
  dependsOn: ReadonlyArray<AssemblyStageId>
  status: AssemblyStageStatus
  startedAtMs?: number
  durationMs?: number
  reasonCode?: AssemblyReasonCode
  message?: string
}

export interface RootContextLifecycleRecord {
  readonly state: 'uninitialized' | 'merged' | 'ready' | 'failed'
  readonly mergedAtStageSeq?: number
  readonly readyAtStageSeq?: number
  readonly reasonCode?: AssemblyReasonCode
}

export interface BootFailureDiagnostic {
  readonly stageId: AssemblyStageId
  readonly stageSeq: number
  readonly reasonCode: AssemblyReasonCode
  readonly message: string
  readonly upstreamStages: ReadonlyArray<AssemblyStageId>
}

export interface BootAssemblyReport {
  readonly version: 1
  readonly appId: string
  readonly success: boolean
  readonly nodes: ReadonlyArray<AppAssemblyGraphNode>
  readonly rootContextLifecycle: RootContextLifecycleRecord
  readonly failure?: BootFailureDiagnostic
}

const STAGE_DEFINITIONS: ReadonlyArray<AssemblyStageDefinition> = [
  { stageId: 'validate.modules', dependsOn: [] },
  { stageId: 'validate.tags', dependsOn: ['validate.modules'] },
  { stageId: 'build.baseLayer', dependsOn: ['validate.tags'] },
  { stageId: 'build.baseEnv', dependsOn: ['build.baseLayer'] },
  { stageId: 'build.moduleEnvs', dependsOn: ['build.baseEnv'] },
  { stageId: 'merge.env', dependsOn: ['build.moduleEnvs'] },
  { stageId: 'rootContext.merge', dependsOn: ['merge.env'] },
  { stageId: 'rootContext.ready', dependsOn: ['rootContext.merge'] },
  { stageId: 'process.install', dependsOn: ['rootContext.ready'] },
]

export const APP_ASSEMBLY_STAGE_ORDER: ReadonlyArray<AssemblyStageDefinition> = STAGE_DEFINITIONS

const toSlimMessage = (error: unknown): string => {
  if (error instanceof Error && typeof error.message === 'string' && error.message.length > 0) {
    return error.message
  }

  const message = (error as { message?: unknown } | null)?.message
  if (typeof message === 'string' && message.length > 0) {
    return message
  }

  if (typeof error === 'string' && error.length > 0) {
    return error
  }

  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

export class AppAssemblyGraph {
  private readonly nodes: Array<MutableAppAssemblyGraphNode>
  private readonly nodeIndex: ReadonlyMap<AssemblyStageId, MutableAppAssemblyGraphNode>
  private rootContextLifecycle: RootContextLifecycleRecord = { state: 'uninitialized' }
  private failure: BootFailureDiagnostic | undefined

  constructor(private readonly appId: string) {
    const mutableNodes: Array<MutableAppAssemblyGraphNode> = STAGE_DEFINITIONS.map((stage, index) => ({
      stageId: stage.stageId,
      stageSeq: index + 1,
      dependsOn: stage.dependsOn,
      status: 'pending',
    }))

    this.nodes = mutableNodes
    this.nodeIndex = new Map(mutableNodes.map((node) => [node.stageId, node] as const))
  }

  reset(): void {
    for (const node of this.nodes) {
      node.status = 'pending'
      node.startedAtMs = undefined
      node.durationMs = undefined
      node.reasonCode = undefined
      node.message = undefined
    }
    this.rootContextLifecycle = { state: 'uninitialized' }
    this.failure = undefined
  }

  beginStage(stageId: AssemblyStageId): void {
    const node = this.getNode(stageId)
    if (node.status === 'pending') {
      node.status = 'running'
      node.startedAtMs = Date.now()
    }
  }

  completeStage(stageId: AssemblyStageId): void {
    const node = this.getNode(stageId)
    node.status = 'succeeded'
    node.durationMs = this.computeDurationMs(node)
  }

  failStage(stageId: AssemblyStageId, reasonCode: AssemblyReasonCode, error: unknown): void {
    const node = this.getNode(stageId)
    node.status = 'failed'
    node.durationMs = this.computeDurationMs(node)
    node.reasonCode = reasonCode
    node.message = toSlimMessage(error)

    this.failure = {
      stageId,
      stageSeq: node.stageSeq,
      reasonCode,
      message: node.message,
      upstreamStages: node.dependsOn,
    }

    if (stageId === 'rootContext.merge' || stageId === 'rootContext.ready') {
      this.markRootContextFailed(reasonCode)
    }

    for (const currentNode of this.nodes) {
      if (currentNode.stageSeq > node.stageSeq && currentNode.status === 'pending') {
        currentNode.status = 'skipped'
      }
    }
  }

  ensureFailure(reasonCode: AssemblyReasonCode, error: unknown): void {
    if (this.failure) {
      return
    }

    const fallbackNode =
      this.nodes.find((node) => node.status === 'running') ??
      this.nodes.find((node) => node.status === 'pending') ??
      this.nodes[this.nodes.length - 1]

    if (!fallbackNode) {
      return
    }

    this.failStage(fallbackNode.stageId, reasonCode, error)
  }

  markRootContextMerged(): void {
    const mergeStageSeq = this.getNode('rootContext.merge').stageSeq
    this.rootContextLifecycle = {
      state: this.rootContextLifecycle.state === 'ready' ? 'ready' : 'merged',
      mergedAtStageSeq: mergeStageSeq,
      readyAtStageSeq: this.rootContextLifecycle.readyAtStageSeq,
      reasonCode: this.rootContextLifecycle.reasonCode,
    }
  }

  markRootContextReady(): void {
    const readyStageSeq = this.getNode('rootContext.ready').stageSeq
    this.rootContextLifecycle = {
      state: 'ready',
      mergedAtStageSeq: this.rootContextLifecycle.mergedAtStageSeq,
      readyAtStageSeq: readyStageSeq,
      reasonCode: undefined,
    }
  }

  buildReport(success: boolean): BootAssemblyReport {
    return {
      version: 1,
      appId: this.appId,
      success,
      nodes: this.nodes.map((node) => ({
        stageId: node.stageId,
        stageSeq: node.stageSeq,
        dependsOn: node.dependsOn,
        status: node.status,
        durationMs: node.durationMs,
        reasonCode: node.reasonCode,
        message: node.message,
      })),
      rootContextLifecycle: { ...this.rootContextLifecycle },
      failure: this.failure ? { ...this.failure } : undefined,
    }
  }

  private markRootContextFailed(reasonCode: AssemblyReasonCode): void {
    this.rootContextLifecycle = {
      state: 'failed',
      mergedAtStageSeq: this.rootContextLifecycle.mergedAtStageSeq,
      readyAtStageSeq: this.rootContextLifecycle.readyAtStageSeq,
      reasonCode,
    }
  }

  private getNode(stageId: AssemblyStageId): MutableAppAssemblyGraphNode {
    const node = this.nodeIndex.get(stageId)
    if (!node) {
      throw new Error(`[Logix] Unknown assembly stage: ${stageId}`)
    }
    return node
  }

  private computeDurationMs(node: MutableAppAssemblyGraphNode): number | undefined {
    if (node.startedAtMs === undefined) {
      return undefined
    }

    return Math.max(0, Date.now() - node.startedAtMs)
  }
}
