# 2. Link (The Edge)

- **Link**
  - 概念上是「连接不同 Module 的逻辑纽带」：
    - 在可视化视图（Galaxy/Canvas）中表现为连接 Module 节点的“边（Edge）”；
    - 负责表达“当 A 发生时，触发 B”的跨模块协作意图。
  - **运行时映射**：
    - Link **不是** 一个独立的运行时原语（没有 `Link.define`）。
    - 它在代码层面通过 **Logic** + **Bound API (`$.use`)** 实现：
      - `$.use(TargetModule)` 声明依赖；
      - `yield* $.on(source$).run((value) => target.dispatch(/* action from value */))` 实现交互。
  - **历史注**：曾被称为 `Orchestrator`，现已废弃该术语，统一收敛为 Link（图视角）与 Logic（代码视角）。
