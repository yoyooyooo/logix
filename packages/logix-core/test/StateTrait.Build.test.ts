import { describe, it, expect } from "@effect/vitest"
import { Schema } from "effect"
import * as Logix from "../src/index.js"

describe("StateTrait.build", () => {
  const StateSchema = Schema.Struct({
    a: Schema.Number,
    b: Schema.Number,
    sum: Schema.Number,
    profile: Schema.Struct({
      id: Schema.String,
      name: Schema.String,
    }),
  })

  type State = Schema.Schema.Type<typeof StateSchema>

  it("should build a program with graph and plan from a valid spec", () => {
    const traits = Logix.StateTrait.from(StateSchema)({
      sum: Logix.StateTrait.computed({
        deps: ["a", "b"],
        get: (s: Readonly<State>) => s.a + s.b,
      }),
      // 简单 link：profile.name 跟随 profile.id（仅用于验证 Graph / Plan 结构）
      "profile.name": Logix.StateTrait.link({
        from: "profile.id",
      }),
    })

    const program = Logix.StateTrait.build(StateSchema, traits)

    // 基础结构：Program / Graph / Plan 均已构建
    expect(program.stateSchema).toBe(StateSchema)
    expect(program.spec).toBe(traits)

    const graph = program.graph
    const plan = program.plan

    expect(graph._tag).toBe("StateTraitGraph")
    expect(Array.isArray(graph.nodes)).toBe(true)
    expect(Array.isArray(graph.edges)).toBe(true)

    // 应该至少包含 sum / profile.name 两个字段节点
    const nodeIds = graph.nodes.map((n) => n.id).sort()
    expect(nodeIds).toContain("sum")
    expect(nodeIds).toContain("profile.name")

    // link 边：profile.id -> profile.name
    const linkEdges = graph.edges.filter((e) => e.kind === "link")
    expect(linkEdges).toEqual([
      {
        id: "link:profile.id->profile.name",
        from: "profile.id",
        to: "profile.name",
        kind: "link",
      },
    ])

    expect(plan._tag).toBe("StateTraitPlan")
    expect(Array.isArray(plan.steps)).toBe(true)

    // Plan 中应包含 sum 的 computed-update 与 profile.name 的 link-propagate
    const kinds = plan.steps.map((s) => s.kind).sort()
    expect(kinds).toEqual(["computed-update", "link-propagate"])

    const sumStep = plan.steps.find(
      (s) => s.kind === "computed-update" && s.targetFieldPath === "sum",
    )
    expect(sumStep).toBeDefined()

    const linkStep = plan.steps.find(
      (s) =>
        s.kind === "link-propagate" &&
        s.targetFieldPath === "profile.name" &&
        s.sourceFieldPaths?.[0] === "profile.id",
    )
    expect(linkStep).toBeDefined()
  })

  it("should throw when link traits form a cycle", () => {
    const traits = Logix.StateTrait.from(StateSchema)({
      // a <- b, b <- a 形成环路
      a: Logix.StateTrait.link({ from: "b" }),
      b: Logix.StateTrait.link({ from: "a" }),
    })

    expect(() => Logix.StateTrait.build(StateSchema, traits)).toThrowError(
      /link cycle detected/i,
    )
  })
})
