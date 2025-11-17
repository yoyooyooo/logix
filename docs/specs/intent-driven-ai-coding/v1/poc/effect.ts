// 简化版 Effect 类型定义，仅用于示意。
// 实际项目中可以替换为 effect-ts 或其他实现。

export type Effect<R, E, A> = (env: R) => Promise<A> // 错误 E 可先忽略，用 A | throws 表示

// 运行 Effect 的辅助函数（PoC 级别，不考虑复杂错误处理）
export async function runEffect<R, E, A>(
  eff: Effect<R, E, A>,
  env: R
): Promise<A> {
  return eff(env)
}

