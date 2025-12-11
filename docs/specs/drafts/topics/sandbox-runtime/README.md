---
title: Sandbox & Verifiable Intent (Topic)
status: draft
version: 2025-12-07
value: core
priority: next
---

# Sandbox & Verifiable Intent

> 本主题围绕「Logix Sandbox / Verifiable Intent Engine」形成体系化草稿，先夯实前端沙箱与基础设施，再分阶段扩展 Intent 覆盖、AI 反馈、后端逃生舱等高阶能力。

## 文档导航

| 编号   | 文档                                                           | 状态    | 说明                                 |
| ------ | -------------------------------------------------------------- | ------- | ------------------------------------ |
| 00     | [overview](./00-overview.md)                                   | ✅ 完整 | 分阶段路线图                         |
| **05** | [architecture-and-boundary](./05-architecture-and-boundary.md) | ✅ 完整 | 架构与边界定义                       |
| 10     | [runtime-baseline](./10-runtime-baseline.md)                   | ⚡ 框架 | Worker 生命周期、Watchdog            |
| **15** | [protocol-and-schema](./15-protocol-and-schema.md)             | ✅ 完整 | 协议与 Schema 定义                   |
| 20     | [dependency-and-mock](./20-dependency-and-mock-strategy.md)    | ⚡ 框架 | 依赖治理、Mock 策略                  |
| **25** | [sandbox-package-api](./25-sandbox-package-api.md)             | ✅ 完整 | `@logix/sandbox` API 设计            |
| 30     | [intent-coverage](./30-intent-coverage-and-ai-feedback.md)     | 📝 占位 | Intent 覆盖与 AI 反馈                |
| 40     | [multi-runtime-funnel](./40-multi-runtime-funnel.md)           | 📝 占位 | 多运行时漏斗                         |
| 50     | [devtools-session-diff](./50-devtools-session-and-diff.md)     | 📝 占位 | DevTools Session 与 Diff             |
| 60     | [vision-alignment-lab](./60-vision-runtime-alignment-lab.md)   | 🌟 愿景 | **Sandbox as Runtime Alignment Lab** |
| MVP    | [mvp/README](./mvp/README.md)                                  | ⚡ 收窄 | 省市区联动 MVP 实施方案              |

---

## 落实优先级

### P0 — 当前阶段（基础运行时）

- [ ] **协议落地**：按 [15-protocol-and-schema.md](./15-protocol-and-schema.md) 实现 TypeScript 类型
- [ ] **Worker 入口**：创建 `@logix/sandbox` 包骨架
- [ ] **Kernel 预注入**：`effect` + `@logix/core` 预打包 + Blob URL
- [ ] **Watchdog**：超时熔断 + Hard Reset

> P0 的实际落地以「省市区联动」场景为唯一 MVP，用一个具体用例验证 Host↔Worker 协议、Kernel 预注入与基础可观测性是否满足平台需要，避免过早设计完整 Playground 形态。

### P1 — 短期跟进

- [ ] **SandboxClient API**：按 [25-sandbox-package-api.md](./25-sandbox-package-api.md) 实现核心方法
- [ ] **useSandbox Hook**：React 集成
- [ ] **MockManifest 解析**：HTTP/SDK/UI Mock 配置处理

### P2 — 中期扩展

- [ ] **Universal Spy**：未知 IO 的递归 Proxy Mock
- [ ] **Semantic UI Mock**：Modal/Button 等基础组件
- [ ] **Trace 输出**：与 DebugSink 对接

### P3 — 后续阶段

- [ ] Intent 覆盖率统计
- [ ] AI 诊断输出
- [ ] Deno 逃生舱
- [ ] Session Diff

---

## 与其他文档的关系

| 文档类型              | 路径                                                 | 关系                         |
| --------------------- | ---------------------------------------------------- | ---------------------------- |
| v3 规范               | `v3/platform/impl/code-runner-and-sandbox.md`        | 决策依据（Frontend First）   |
| L4 草案               | `L4/logix-sandbox-verifiable-intent-architecture.md` | 已下沉到本 topic             |
| runtime-logix         | `docs/specs/runtime-logix`                           | Sandbox 复用 Platform/Tracer |
| runtime-observability | `topics/runtime-observability`                       | DebugSink/TraceBus 对接      |
| devtools-and-studio   | `topics/devtools-and-studio`                         | Waterfall/线框视图消费       |
| **Vision**            | `60-vision-runtime-alignment-lab.md`                 | 总体愿景 & 演进哲学          |

---

## 变更历史

- **2025-12-07**：整合 L4 草案，补充协议定义和 API 设计
- **2025-12-06**：初始创建 topic 结构
