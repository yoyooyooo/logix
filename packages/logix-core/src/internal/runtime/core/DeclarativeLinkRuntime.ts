import { Effect } from 'effect'
import type { ReadQueryCompiled } from './ReadQuery.js'
import type { DeclarativeLinkIR, DeclarativeLinkNodeId } from './DeclarativeLinkIR.js'
import type { ModuleInstanceKey, RuntimeStoreModuleCommit } from './RuntimeStore.js'

export interface ModuleAsSourceLink {
  readonly id: string
  readonly sourceModuleInstanceKey: ModuleInstanceKey
  readonly readQuery: ReadQueryCompiled<any, any>
  readonly computeValue: (snapshot: unknown) => unknown
  readonly equalsValue: (a: unknown, b: unknown) => boolean
  readonly applyValue: (next: unknown) => Effect.Effect<void, never, never>
}

export interface DeclarativeLinkRegistration {
  readonly linkId: string
  readonly ir: DeclarativeLinkIR
  readonly readNodes: ReadonlyArray<{
    readonly nodeId: DeclarativeLinkNodeId
    readonly moduleInstanceKey: ModuleInstanceKey
    readonly readQuery: ReadQueryCompiled<any, any>
  }>
  readonly dispatchNodes: ReadonlyArray<{
    readonly nodeId: DeclarativeLinkNodeId
    readonly dispatch: (payload: unknown) => Effect.Effect<void, never, never>
  }>
}

export interface DeclarativeLinkRuntime {
  readonly registerModuleAsSourceLink: (link: ModuleAsSourceLink) => () => void
  readonly registerDeclarativeLink: (link: DeclarativeLinkRegistration) => () => void
  readonly applyForSources: (args: {
    readonly tickSeq: number
    readonly acceptedModules: ReadonlyMap<ModuleInstanceKey, RuntimeStoreModuleCommit>
    readonly changedModuleInstanceKeys: ReadonlyArray<ModuleInstanceKey>
  }) => Effect.Effect<{ readonly scheduled: boolean }, never, never>
}

type StoredModuleAsSourceLink = ModuleAsSourceLink & {
  hasValue: boolean
  lastValue: unknown
}

type StoredDeclarativeLink = DeclarativeLinkRegistration & {
  readonly readNodeById: ReadonlyMap<string, { readonly nodeId: DeclarativeLinkNodeId; readonly moduleInstanceKey: ModuleInstanceKey; readonly readQuery: ReadQueryCompiled<any, any> }>
  readonly dispatchNodeById: ReadonlyMap<string, { readonly nodeId: DeclarativeLinkNodeId; readonly dispatch: (payload: unknown) => Effect.Effect<void, never, never> }>
  readonly dispatchTargetsByReadNode: ReadonlyMap<string, ReadonlyArray<DeclarativeLinkNodeId>>
  readonly readNodeState: Map<string, { hasValue: boolean; lastValue: unknown }>
}

export const makeDeclarativeLinkRuntime = (): DeclarativeLinkRuntime => {
  const moduleAsSourceById = new Map<string, StoredModuleAsSourceLink>()
  const moduleAsSourceIdsBySource = new Map<ModuleInstanceKey, Set<string>>()

  const declarativeById = new Map<string, StoredDeclarativeLink>()
  const declarativeReadNodesBySource = new Map<ModuleInstanceKey, Array<{ readonly linkId: string; readonly nodeId: DeclarativeLinkNodeId }>>()

  const registerModuleAsSourceLink: DeclarativeLinkRuntime['registerModuleAsSourceLink'] = (link) => {
    const stored: StoredModuleAsSourceLink = {
      ...link,
      hasValue: false,
      lastValue: undefined,
    }

    moduleAsSourceById.set(link.id, stored)
    const set = moduleAsSourceIdsBySource.get(link.sourceModuleInstanceKey) ?? new Set<string>()
    set.add(link.id)
    moduleAsSourceIdsBySource.set(link.sourceModuleInstanceKey, set)

    return () => {
      moduleAsSourceById.delete(link.id)
      const current = moduleAsSourceIdsBySource.get(link.sourceModuleInstanceKey)
      if (!current) return
      current.delete(link.id)
      if (current.size === 0) {
        moduleAsSourceIdsBySource.delete(link.sourceModuleInstanceKey)
      }
    }
  }

  const registerDeclarativeLink: DeclarativeLinkRuntime['registerDeclarativeLink'] = (link) => {
    const readNodeById = new Map<string, { readonly nodeId: DeclarativeLinkNodeId; readonly moduleInstanceKey: ModuleInstanceKey; readonly readQuery: ReadQueryCompiled<any, any> }>()
    for (const n of link.readNodes) {
      readNodeById.set(n.nodeId, n)
    }

    const dispatchNodeById = new Map<
      string,
      { readonly nodeId: DeclarativeLinkNodeId; readonly dispatch: (payload: unknown) => Effect.Effect<void, never, never> }
    >()
    for (const n of link.dispatchNodes) {
      dispatchNodeById.set(n.nodeId, n)
    }

    // V1 constraint: dispatch must have at most one incoming edge, interpreted as "payload flow".
    const incomingByDispatch = new Map<string, number>()
    for (const e of link.ir.edges) {
      const to = e.to
      const isDispatch = dispatchNodeById.has(to)
      if (!isDispatch) continue
      incomingByDispatch.set(to, (incomingByDispatch.get(to) ?? 0) + 1)
      const count = incomingByDispatch.get(to) ?? 0
      if (count > 1) {
        throw new Error(
          `[DeclarativeLinkRuntime] Invalid DeclarativeLinkIR: dispatch node has multiple incoming edges (linkId=${link.linkId}, nodeId=${to}).`,
        )
      }
    }

    const dispatchTargetsByReadNode = new Map<string, Array<DeclarativeLinkNodeId>>()
    for (const e of link.ir.edges) {
      const from = e.from
      const to = e.to
      if (!readNodeById.has(from)) continue
      if (!dispatchNodeById.has(to)) continue
      const list = dispatchTargetsByReadNode.get(from) ?? []
      list.push(to)
      dispatchTargetsByReadNode.set(from, list)
    }

    const stored: StoredDeclarativeLink = {
      ...link,
      readNodeById,
      dispatchNodeById,
      dispatchTargetsByReadNode,
      readNodeState: new Map(),
    }

    declarativeById.set(link.linkId, stored)

    for (const n of link.readNodes) {
      const list = declarativeReadNodesBySource.get(n.moduleInstanceKey) ?? []
      list.push({ linkId: link.linkId, nodeId: n.nodeId })
      declarativeReadNodesBySource.set(n.moduleInstanceKey, list)
    }

    return () => {
      declarativeById.delete(link.linkId)
      for (const n of link.readNodes) {
        const list = declarativeReadNodesBySource.get(n.moduleInstanceKey)
        if (!list) continue
        const next = list.filter((x) => !(x.linkId === link.linkId && x.nodeId === n.nodeId))
        if (next.length === 0) {
          declarativeReadNodesBySource.delete(n.moduleInstanceKey)
        } else {
          declarativeReadNodesBySource.set(n.moduleInstanceKey, next)
        }
      }
    }
  }

  const applyForSources: DeclarativeLinkRuntime['applyForSources'] = (args) =>
    Effect.gen(function* () {
      let scheduled = false

      // ---- Module-as-Source edges (module readQuery -> externalStore trait writeback) ----
      for (const sourceKey of args.changedModuleInstanceKeys) {
        const ids = moduleAsSourceIdsBySource.get(sourceKey)
        if (!ids || ids.size === 0) continue
        const commit = args.acceptedModules.get(sourceKey)
        if (!commit) continue

        for (const id of ids) {
          const link = moduleAsSourceById.get(id)
          if (!link) continue

          let selected: unknown
          try {
            selected = link.readQuery.select(commit.state as any)
          } catch {
            continue
          }

          const nextValue = link.computeValue(selected)
          if (link.hasValue && link.equalsValue(link.lastValue, nextValue)) {
            continue
          }

          link.hasValue = true
          link.lastValue = nextValue
          scheduled = true
          yield* link.applyValue(nextValue)
        }
      }

      // ---- DeclarativeLinkIR edges (module readQuery -> dispatch) ----
      for (const sourceKey of args.changedModuleInstanceKeys) {
        const refs = declarativeReadNodesBySource.get(sourceKey)
        if (!refs || refs.length === 0) continue
        const commit = args.acceptedModules.get(sourceKey)
        if (!commit) continue

        for (const ref of refs) {
          const link = declarativeById.get(ref.linkId)
          if (!link) continue
          const readNode = link.readNodeById.get(ref.nodeId)
          if (!readNode) continue

          let value: unknown
          try {
            value = readNode.readQuery.select(commit.state as any)
          } catch {
            continue
          }

          const state = link.readNodeState.get(ref.nodeId) ?? { hasValue: false, lastValue: undefined }
          const changed = !state.hasValue || !Object.is(state.lastValue, value)
          if (!changed) continue

          state.hasValue = true
          state.lastValue = value
          link.readNodeState.set(ref.nodeId, state)

          const targets = link.dispatchTargetsByReadNode.get(ref.nodeId) ?? []
          for (const dispatchNodeId of targets) {
            const node = link.dispatchNodeById.get(dispatchNodeId)
            if (!node) continue
            scheduled = true
            yield* node.dispatch(value)
          }
        }
      }

      return { scheduled } as const
    })

  return {
    registerModuleAsSourceLink,
    registerDeclarativeLink,
    applyForSources,
  }
}
