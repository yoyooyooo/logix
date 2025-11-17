# 1. Module / Logic / Flow / Control

- **Module**
  - 历史上本仓曾使用术语 **Store** 指代“可运行的状态单元”；现已统一为 **Module**（避免与 `ModuleTag`/`ModuleImpl` 等实现名漂移）。
  - 概念上是「一个可独立演进/复用的状态+动作模块」：
    - 有自己的 State Schema 与 Action Schema；
    - 提供读写、订阅与派发能力。
  - 不等价于“页面”或“组件”，更类似于“业务模块的可运行单元”。

- **Logic**
  - 概念上是「在某一类 Module 上长期运行的一段业务程序」；
  - 以 Effect 形态表达，Env 中可以看到当前 Module 的 runtime 能力以及额外的 Module Service；
  - 通过 Flow + Effect 原生结构化控制流（含 `$.match`/`$.matchTag`）组合形成可视化的业务流程。

- **Flow**
  - 概念上是「围绕时间与事件流的编排工具集」：
    - 回答「从哪里开始？如何触发？如何控制并发？」；
    - fromAction / fromState / debounce / runLatest / runExhaust 等（并发语义通过 `run` / `runLatest` / `runExhaust` / `runParallel` 等算子表达）。
  - 不负责业务决策，只负责“什么时候跑哪个 Effect”。

- **Control**
  - 概念上是「围绕 Effect 的结构化控制流工具集」：
    - 回答「触发之后怎么执行？有哪些分支/错误域/并发结构？」；
    - branch / tryCatch / parallel 等。
  - **实现对齐（重要）**：当前实现无独立 `Control` 模块/命名空间；这里的 Control 仅指结构化控制流概念层：Effect 原生算子（`Effect.catch*` / `Effect.all` 等）+ `@logix/core` 的 `$.match`/`$.matchTag` helper。
  - 对平台而言，这些算子是构建 Logic Graph 的结构锚点。
