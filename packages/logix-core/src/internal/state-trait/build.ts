import type { Schema } from "effect"
import {
  type StateTraitProgram,
  type StateTraitSpec,
  type StateTraitEntry,
  type StateTraitGraph,
  type StateTraitGraphEdge,
  type StateTraitGraphNode,
  type StateTraitField,
  type StateTraitFieldTrait,
  type StateTraitPlan,
  type StateTraitPlanStep,
  type StateTraitResource,
  collectNodeMeta,
  normalizeSpec,
} from "./model.js"
import * as Meta from "./meta.js"

/**
 * 根据 StateTraitEntry 构造标准化的 FieldTrait。
 *
 * - 目前仅对 link/source 填充 deps 信息，computed 的依赖暂不静态分析；
 * - 后续若引入显式依赖声明，可以在此处扩展。
 */
const toFieldTrait = (
  entry: StateTraitEntry<any, string>,
): StateTraitFieldTrait => {
  const deps: Array<string> = []

  if (entry.kind === "computed") {
    const meta = entry.meta as any
    const list = meta.deps as ReadonlyArray<string> | undefined
    if (list) deps.push(...list)
  } else if (entry.kind === "source") {
    const meta = entry.meta as any
    const list = meta.deps as ReadonlyArray<string> | undefined
    if (list) deps.push(...list)
  } else if (entry.kind === "link") {
    deps.push(entry.meta.from as string)
  } else if (entry.kind === "check") {
    const meta = entry.meta as any
    const rules = (meta?.rules ?? {}) as Record<string, any>
    for (const name of Object.keys(rules)) {
      const rule = rules[name]
      if (rule && typeof rule === "object") {
        const list = rule.deps as ReadonlyArray<string> | undefined
        if (list) deps.push(...list)
      }
    }
  }

  return {
    fieldId: entry.fieldPath,
    kind: entry.kind,
    // meta 在运行时保持与 Entry.meta 一致，便于 install 直接复用。
    meta: entry.meta as any,
    deps,
  }
}

/**
 * 从归一化的 Entry 列表构建 Field / Node / Edge / Resource 集合。
 */
const buildGraph = (
  entries: ReadonlyArray<StateTraitEntry<any, string>>,
  nodeMetaByFieldPath: ReadonlyMap<string, Meta.TraitMeta>,
): {
  readonly graph: StateTraitGraph
  readonly plan: StateTraitPlan
} => {
  const fieldMap = new Map<string, StateTraitField>()
  const nodes: Array<StateTraitGraphNode> = []
  const edges: Array<StateTraitGraphEdge> = []
  const resourcesById = new Map<string, StateTraitResource>()
  const planSteps: Array<StateTraitPlanStep> = []

  const ensureField = (fieldPath: string): StateTraitField => {
    let field = fieldMap.get(fieldPath)
    if (!field) {
      field = {
        id: fieldPath,
        path: fieldPath,
        traits: [],
      }
      fieldMap.set(fieldPath, field)
    }
    return field
  }

  for (const entry of entries) {
    const fieldPath = entry.fieldPath
    const field = ensureField(fieldPath)
    const trait = toFieldTrait(entry)

    ;(field.traits as Array<StateTraitFieldTrait>).push(trait)

    // 针对不同 kind 构建 Graph 边与 Plan 步骤。
    if (entry.kind === "computed") {
      const stepId = `computed:${fieldPath}`
      planSteps.push({
        id: stepId,
        kind: "computed-update",
        targetFieldPath: fieldPath,
        // 说明：当前版本不静态分析 computed 依赖字段，sourceFieldPaths 留空。
      })
      // 若显式声明 deps，则补充 Graph 边（用于诊断/反向闭包计算）。
      const deps = (entry.meta as any).deps as ReadonlyArray<string> | undefined
      if (deps) {
        for (const dep of deps) {
          ensureField(dep)
          edges.push({
            id: `computed:${dep}->${fieldPath}`,
            from: dep,
            to: fieldPath,
            kind: "computed",
          })
        }
      }
    } else if (entry.kind === "link") {
      const from = entry.meta.from as string
      ensureField(from)

      const edgeId = `link:${from}->${fieldPath}`
      edges.push({
        id: edgeId,
        from,
        to: fieldPath,
        kind: "link",
      })

      planSteps.push({
        id: `link:${fieldPath}`,
        kind: "link-propagate",
        targetFieldPath: fieldPath,
        sourceFieldPaths: [from],
        debugInfo: {
          graphEdgeId: edgeId,
        },
      })
    } else if (entry.kind === "source") {
      const resourceId = entry.meta.resource
      const resourceMeta = Meta.sanitize((entry.meta as any).meta)

      const existing = resourcesById.get(resourceId)
      if (existing) {
        const ownerFields = [...existing.ownerFields, fieldPath]
        let meta = existing.meta
        let metaOrigin = existing.metaOrigin
        let metaConflicts = existing.metaConflicts

        if (resourceMeta) {
          const merged = Meta.mergeCanonical(
            { meta, origin: metaOrigin, conflicts: metaConflicts },
            { origin: fieldPath, meta: resourceMeta },
          )
          meta = merged.meta
          metaOrigin = merged.origin
          metaConflicts = merged.conflicts
        }

        resourcesById.set(resourceId, {
          ...existing,
          ownerFields,
          meta,
          metaOrigin,
          metaConflicts,
        })
      } else {
        resourcesById.set(resourceId, {
          resourceId,
          // 暂时使用简单的标识字符串，后续可根据 key 规则进一步结构化。
          keySelector: `StateTrait.source@${fieldPath}`,
          ownerFields: [fieldPath],
          meta: resourceMeta,
          metaOrigin: resourceMeta ? fieldPath : undefined,
        })
      }

      planSteps.push({
        id: `source:${fieldPath}`,
        kind: "source-refresh",
        targetFieldPath: fieldPath,
        resourceId,
        keySelectorId: `StateTrait.source@${fieldPath}`,
      })

      const deps = (entry.meta as any).deps as ReadonlyArray<string> | undefined
      if (deps) {
        for (const dep of deps) {
          ensureField(dep)
          edges.push({
            id: `source-dep:${dep}->${fieldPath}`,
            from: dep,
            to: fieldPath,
            kind: "source-dep",
          })
        }
      }
    } else if (entry.kind === "check") {
      planSteps.push({
        id: `check:${fieldPath}`,
        kind: "check-validate",
        targetFieldPath: fieldPath,
      })

      // 若规则显式声明 deps，则补充 Graph 边（用于 ReverseClosure scoped validate）。
      if (trait.deps.length > 0) {
        for (const dep of trait.deps) {
          ensureField(dep)
          edges.push({
            id: `check-dep:${dep}->${fieldPath}`,
            from: dep,
            to: fieldPath,
            kind: "check-dep",
          })
        }
      }
    }
  }

  for (const field of fieldMap.values()) {
    nodes.push({
      id: field.id,
      field,
      traits: field.traits,
      meta: nodeMetaByFieldPath.get(field.id),
    })
  }

  const graph: StateTraitGraph = {
    _tag: "StateTraitGraph",
    nodes,
    edges,
    resources: Array.from(resourcesById.values()),
  }

  const plan: StateTraitPlan = {
    _tag: "StateTraitPlan",
    steps: planSteps,
  }

  return { graph, plan }
}

/**
 * 针对 link 边进行简单的环路检测。
 *
 * - 仅考虑 kind = "link" 的边，computed/source 首版不参与环检测；
 * - 若发现环路，抛出带有路径信息的错误，避免在运行时进入无限更新。
 */
const assertNoLinkCycles = (edges: ReadonlyArray<StateTraitGraphEdge>): void => {
  const adjacency = new Map<string, string[]>()

  for (const edge of edges) {
    if (edge.kind !== "link") continue
    const list = adjacency.get(edge.from) ?? []
    list.push(edge.to)
    adjacency.set(edge.from, list)
  }

  const visited = new Set<string>()
  const stack = new Set<string>()

  const dfs = (node: string): void => {
    if (stack.has(node)) {
      throw new Error(
        `[StateTrait.build] link cycle detected at field "${node}". ` +
          "Please check link traits for circular dependencies.",
      )
    }
    if (visited.has(node)) return
    visited.add(node)
    stack.add(node)

    const nexts = adjacency.get(node)
    if (nexts) {
      for (const to of nexts) {
        dfs(to)
      }
    }

    stack.delete(node)
  }

  for (const node of adjacency.keys()) {
    if (!visited.has(node)) {
      dfs(node)
    }
  }
}

/**
 * 根据给定的 stateSchema 与 traits spec 构造 StateTraitProgram。
 *
 * - 纯函数：不依赖外部 Env / 全局状态；
 * - 当前实现聚焦于：
 *   - 从 Spec 归一化出 Entry 列表；
 *   - 基于 Entry 构建轻量版 Graph / Plan；
 *   - 对 link 边做基本环路检测。
 *
 * 后续若需要更精细的依赖分析（例如对 computed/key 做静态解析），
 * 可以在本模块内演进实现，而不影响对外 API。
 */
export const build = <S extends object>(
  stateSchema: Schema.Schema<S, any>,
  spec: StateTraitSpec<S>,
): StateTraitProgram<S> => {
  const entries = normalizeSpec(spec) as ReadonlyArray<StateTraitEntry<S, string>>
  const nodeMetaByFieldPath = collectNodeMeta(spec)

  // Phase 4（US2）：强制显式 deps（Graph/diagnostics/replay 只认 deps 作为依赖事实源）。
  for (const entry of entries) {
    if (entry.kind === "computed") {
      const deps = (entry.meta as any).deps as ReadonlyArray<string> | undefined
      if (deps === undefined) {
        throw new Error(
          `[StateTrait.build] Missing explicit deps for computed "${entry.fieldPath}". ` +
            "Please use StateTrait.computed({ deps: [...], get: ... }).",
        )
      }
    }
    if (entry.kind === "source") {
      const deps = (entry.meta as any).deps as ReadonlyArray<string> | undefined
      if (deps === undefined) {
        throw new Error(
          `[StateTrait.build] Missing explicit deps for source "${entry.fieldPath}". ` +
            "Please provide meta.deps for StateTrait.source({ deps: [...], ... }).",
        )
      }
    }
    if (entry.kind === "check") {
      const rules = ((entry.meta as any)?.rules ?? {}) as Record<string, any>
      for (const name of Object.keys(rules)) {
        const rule = rules[name]
        if (typeof rule === "function" || !rule || typeof rule !== "object") {
          throw new Error(
            `[StateTrait.build] Missing explicit deps for check "${entry.fieldPath}" rule "${name}". ` +
              "Please use { deps: [...], validate: ... } form.",
          )
        }
        if ((rule as any).deps === undefined) {
          throw new Error(
            `[StateTrait.build] Missing explicit deps for check "${entry.fieldPath}" rule "${name}". ` +
              "Please provide deps: [...].",
          )
        }
      }
    }
  }

  const { graph, plan } = buildGraph(entries, nodeMetaByFieldPath)

  // 针对 link 边进行一次环路检测，避免明显的配置错误。
  assertNoLinkCycles(graph.edges)

  return {
    stateSchema,
    spec,
    entries: entries as ReadonlyArray<StateTraitEntry<any, string>>,
    graph,
    plan,
  }
}
