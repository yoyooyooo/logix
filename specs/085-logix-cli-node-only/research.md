# Research: 085 Logix CLI（Node-only）

## Decision 1：CLI 的定位是“基础能力外壳 + 集成测试跑道”

**Rationale**：

- 平台未落地前，需要一个可运行入口把 IR/试跑/索引/回写串起来，形成工程事实（CI 可跑、工件可存）。
- CLI 输出的工件就是未来平台/Devtools/Agent 的输入之一（先把协议跑稳）。

## Decision 2：尽可能用 `effect` 编写（同构）

**Rationale**：

- 命令执行链路包含大量可注入依赖：FS、Clock、Reporter、Budget、Runtime/Engine services。
- 使用 Tag+Layer 组织可以：
  - 在测试里替换 FS/Clock；
  - 在 CLI 与未来平台 Node 服务之间复用同一套核心逻辑。

## Decision 3：输出必须确定性、可序列化、可 diff

**Rationale**：

- CLI 主要服务 CI 与可回放证据链；任何时间戳/随机都会污染对比与审计。

**Key rules**：

- 强制显式 `runId`（避免默认 `Date.now()`）。
- stdout 与落盘文件内容必须稳定（固定字段顺序与稳定排序策略）。

## Decision 4：先复用/迁移 `scripts/ir/inspect-module.ts`（DRY）

**Rationale**：

- 当前脚本已经跑通 `Effect` 组织方式与参数解析雏形（runId/config/timeout/budgets）。
- CLI MVP 应该先把已有能力变成“可安装/可测试/可复用”的包入口，再逐步下沉公共逻辑。
