import type * as Logix from "../src/index.js"

// 类型工具：判断两个类型是否相等 & 断言。
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2)
    ? (<T>() => T extends B ? 1 : 2) extends
        (<T>() => T extends A ? 1 : 2)
      ? true
      : false
    : false

type Assert<T extends true> = T

type State = {
  a: number
  b: number
  sum: number
  profile: {
    id: string
    name: string
  }
  profileResource: unknown
}

type Paths = Logix.StateTrait.StateFieldPath<State>

type ExpectedPaths =
  | "a"
  | "b"
  | "sum"
  | "profile"
  | "profile.id"
  | "profile.name"
  | "profileResource"

// Paths 应与 ExpectedPaths 严格相等（双向约束）。
type _CheckPaths = Assert<
  Equals<Paths, ExpectedPaths>
>

// StateAtPath 应能根据路径推导字段类型。
type _CheckAtRoot = Assert<
  Equals<
    Logix.StateTrait.StateAtPath<State, "profile">,
    { id: string; name: string }
  >
>

type _CheckAtNested = Assert<
  Equals<
    Logix.StateTrait.StateAtPath<State, "profile.name">,
    string
  >
>

type _CheckAtLeaf = Assert<
  Equals<
    Logix.StateTrait.StateAtPath<State, "sum">,
    number
  >
>

// 不存在的路径应推导为 never，用于在后续测试中触发类型错误。
type _CheckInvalidPath = Assert<
  Equals<
    Logix.StateTrait.StateAtPath<State, "profile.age">,
    never
  >
>

