---
title: Harness And Proof Assets Standard
status: living
version: 3
---

# Harness And Proof Assets Standard

## 目标

统一 repo 内 harness、proof、fixture、support 与 coverage inventory 资产的存放、命名、生命周期和追溯方式。

本标准回答三个问题：

- 实时验证或覆盖证明资产放在哪里
- 文件名、测试名、注释和 spec 规划如何表达证明意图
- 发现旧资产把规划编号或过程名带进主阅读路径时，如何顺手收口

## 适用范围

适用对象：

- `*.contract.test.ts`、`*.boundary.test.ts`、`*.guard.test.ts`、`*.harness.test.ts`
- `test/fixtures/**`、`test/support/**`、`test/**/harness.ts`
- specs 下的 `implementation-details/*harness*.md`、`notes/verification.md`
- repo-local proof command、coverage inventory、E2E harness、browser host harness
- 注释、metadata、test title、proof refs 和 verification notes

不适用对象：

- 生产 runtime payload 的正式 schema 设计。生产 schema 只按 runtime 语义设计，不能由 harness 命名反向支配
- 冻结历史材料。`docs/archive/**` 只查阅，不做增量维护

## 资产分类

| 类型 | 用途 | 命名后缀 |
| --- | --- | --- |
| contract test | 证明公开或 repo-internal 合同形状稳定 | `*.contract.test.ts` / `*.contract.test.tsx` |
| boundary test | 证明 owner、phase、host、serialization 或 authority 边界 | `*.boundary.test.ts` / `*.boundary.test.tsx` |
| guard test | 证明禁止项、删除项、负向入口和 regressions 不回流 | `*.guard.test.ts` / `*.guard.test.tsx` |
| harness test | 跨模块覆盖证明、inventory closure、host harness 或 E2E 证明编排 | `*.harness.test.ts` / `*.harness.test.tsx` |
| fixture | 测试输入、受控环境、示例 module、scenario input | `test/fixtures/**` 或 `*.fixture.ts` |
| support | 测试 helper、builder、assertion、transport mock | `test/support/**` |
| spec proof note | 规划阶段的证明要求、命令与结果摘要 | `specs/<id>/implementation-details/**`、`specs/<id>/notes/verification.md` |

`harness` 只在需要编排多层证明或生成 coverage inventory 时使用。普通行为证明优先用 `contract`、`boundary` 或 `guard`。

## 存放位置

可执行测试：

- package 内部合同放在对应 package 的 `test/**`
- repo-internal runtime 证明放在 `packages/logix-core/test/internal/**`
- CLI 路由和 schema 证明放在 `packages/logix-cli/test/**`
- React host adapter 或浏览器宿主证明放在 `packages/logix-react/test/**` 或对应 example 的 browser test

测试支撑：

- 通用 helper 放 `test/support/**`
- 输入数据、module/program fixtures 放 `test/fixtures/**`
- browser 或 perf harness helper 可放 `test/browser/**/harness.ts`
- 临时 adapter、probe 或 capture helper 只能留在 support/fixtures/harness 区，不进入 `src/**` 主阅读路径

Spec 与验证笔记：

- 规划中的证明要求放 `specs/<id>/implementation-details/*harness*.md` 或更具体的 implementation detail 页面
- 已执行命令、digest、gap count、deferred count 和失败轨迹放 `specs/<id>/notes/verification.md`
- 影响需求、架构或质量门的裁决必须同步回写 `spec.md`、`plan.md`、`tasks.md` 或 docs SSoT，不能只留在 notes

禁止位置：

- `src/**` 不放 spec 编号矩阵、coverage inventory truth、planning row helper、temporary probe/witness/pressure helper
- CLI、daemon、browser adapter 不成为 fact authority。它们只能请求 owner-backed fact、转发 artifact ref 或返回 structured gap

## Browser Harness 直达规则

用于 agent/browser 自验证、Playwright E2E、live bridge dogfood 或人工复现的 demo，必须提供稳定直达 URL：

- route 名优先表达最终 demo 或 runtime 行为，例如 `/runtime-counter`
- route 名禁止包含 spec 编号、TASK 编号、pressure/probe/witness 等过程名
- 直达 URL 打开后应直接渲染目标 demo 的首个可交互界面，不依赖 sidebar 点击、临时 modal、hash state 或手工导航前置步骤
- proof note、browser harness 或 E2E 测试必须记录 dev server command、直达 URL、关键 selector/role 和 CLI proof command
- 若发现某个被用于验证的 demo 只能通过 UI 点入，先补稳定 route 或在 spec notes 记录阻塞；导航体验本身是被测对象时除外

## 文件命名规则

文件名优先表达最终行为、边界或合同：

- `runtime-inspect-coverage.harness.test.ts`
- `live-inspect-facet.contract.test.ts`
- `live-operation-admission.guard.test.ts`
- `live-attachment.boundary.test.ts`

文件名禁止表达规划编号或任务编号：

- 禁止：`r172-runtime-inspect.test.ts`
- 禁止：`task-006-scenario-adapter.test.ts`
- 禁止：`cap-pressure-witness.test.ts`
- 禁止：`matrix-row-for-section.test.ts`

当临时证明成为长期回归测试时，必须改名为行为导向的 `contract`、`boundary` 或 `guard`。只有仍在编排多层 coverage closure 时，才保留 `harness`。

## 编号与过程名使用

允许位置：

- test body、`describe`、`it` 文案、metadata、注释中的 `covers: R172-003 / TASK-006 / CAP-* / PF-* / SC-*`
- specs、implementation details、verification notes、review notes
- test-only coverage inventory 中的 matrix row refs

禁止位置：

- `src/**` 的模块名、类型名、函数名、长期变量名、runtime payload 字段、error code、metric name、trace name
- public API、CLI machine contract、React host public route、docs 主叙事标题
- production DTO 的 schema version。schema version 必须用语义版本，例如 `runtime-inspect-coverage.v1`，不能写成 `@172`

例外：

- 生产代码可以用短注释追溯 SSoT、ADR 或 spec 编号来源。编号只能说明边界来源，不能成为分支语义或运行时概念
- `pressure` 如果是稳定性能或背压语义，需要能脱离规划编号独立解释。不能用它表达某个 spec 的 pressure lane、proof pressure 或迁移压力包

## Harness 输出规则

Coverage inventory 可以是 test-only 输出、fixture 或 snapshot-like summary。它必须满足：

- deterministic
- JSON-safe
- 可复现 command
- 明确 owner、route、artifact section、gap reason、deferred owner 或 rejected reason
- 不把 CLI、daemon、browser adapter 记为 fact authority

若 inventory 会进入 canonical evidence、CLI machine output 或 public docs 示例：

- 去掉 spec 编号字段
- 用语义 schema version
- 只暴露 runtime fact family、owner、route、artifact ref、gap/degraded/redacted marker

## Live Evidence Safety Gate

凡是会和 live bridge、debug carrier、proof command 或 runtime evidence 相关的业务包，都必须经过 repo-wide live evidence safety gate。

这个 gate 负责证明：

- production business bundles 不包含 dev-only、live-only 或 debug carrier plumbing
- live evidence proof plumbing 可以被静态分离并从 production bundle 中移除
- bundle sweep、import reachability 和 proof command 输出是确定性的
- proof 只说明 bundle 和 carrier 边界成立，不重定义 runtime truth

允许在 spec、plan、notes 或 proof command 中引用这个 gate，但不要在多个叶子 spec 里重复它的完整规则。
它是跨主题护栏，不是单个 feature 的专属事实源。

当前业务项目 witness 固定为 `examples/logix-react`。标准命令：

```bash
rtk pnpm -C examples/logix-react test:bundle:production
rtk pnpm check:logix-react-production-bundle
```

这个 gate 必须真实执行 Vite production build，并且不得依赖 chunk hash。失败口径固定为：

- 任意 production text asset 含有 React dev/live/debug carrier 稳定 marker，包括 `@logixjs/react/dev/live`、`@logixjs/react/dev/lifecycle`、dev lifecycle carrier symbol、live browser adapter symbol、adapter install/clear/configure 函数名或 debug dispatch carrier marker
- `index.html` 直接引用的初始 JS/CSS asset 含有 Playground 或 Monaco eager marker，例如 playground page/region marker、Monaco editor marker、Monaco loader 或 `MonacoEnvironment`
- production asset 列表含有被禁止的非核心 Monaco language worker

允许懒加载后的 Playground / Monaco chunk 存在。这个 gate 只证明业务生产入口、首屏 eager 边界和 dev/live/debug carrier 静态隔离成立，不证明 Runtime truth、CLI artifact kind 或 canonical evidence envelope。

若同时扫 `packages/logix-react/dist`，dev/live/debug carrier marker 只允许出现在显式 dev 子入口 `packages/logix-react/dist/dev/**`。非 dev 发布入口和业务生产 bundle 必须零命中。

183 解锁 React host adjunct evidence 后，proof asset 仍按本标准放置：

- React host capture、selector fingerprint、render boundary、subscription fanout 和 disabled-overhead 证明放在 `packages/logix-react/test/**`、对应 example browser test 或 repo-internal host harness
- production bundle reachability 继续由本 gate 证明，不下放给 React host 叶子 spec
- host proof 只能证明 adjunct linkage、carrier preservation、gap/redaction/degraded marker 和 disabled path；不能重定义 Runtime truth、CLI artifact kind 或 canonical evidence envelope

## 注释与 Spec 写法

注释只做追溯，不做第二事实源：

```ts
// covers: R172-003, R172-004
```

Spec 可以写编号矩阵和 row mapping，同时必须给出最终实现名：

- route 名：`logix live state`
- artifact section：`state`
- test file：`runtime-inspect-coverage.harness.test.ts`
- owner：`runtime-live`

禁止只写 `R172 row`、`TASK proof` 或 `pressure lane` 而不写最终读者能理解的 runtime noun。

## 生命周期

新增临时验证资产必须写清：

- lifecycle：`temporary-migration`、`retained-harness`、`contract-regression`、`fixture-support`
- cleanup trigger：删除条件或改名条件
- public surface boundary：说明不进入 public authoring、runtime payload 或 CLI machine contract

默认规则：

- 临时迁移 proof 完成后删除
- 仍有长期价值的 proof 改名为行为导向测试
- retained harness 必须有明确 owner、命令和 notes/verification 记录

## 顺手修正规则

当前任务触及某个目录、证明链或文档链时，发现旧资产违反本标准，按以下规则处理：

1. 低风险局部违规直接修正。包括测试文件名、helper 名、注释 wording、spec proof command、matrix helper 下沉到测试侧
2. 引用面可控时同步改引用。包括 `tasks.md`、`plan.md`、`notes/verification.md`、skill 文档和测试命令
3. 影响范围大或可能打断并行工作时，不强行批量迁移。需要在当前 spec notes 或相关 docs followup 中记录命中、风险和建议落点
4. 生产 `src/**` 中出现 spec 编号、matrix row helper、temporary probe/witness/pressure helper 时，默认视为必须收口。若无法立即修，必须记录阻塞原因和 owner

## 验收 Sweep

最小 sweep：

```bash
rtk rg -n "R[0-9]{3}-|TASK-|CAP-|PF-|matrixRow|matrixRowForSection|Probe|Witness|Pressure" packages/*/src examples/*/src --glob '!**/node_modules/**' --glob '!**/dist/**'
rtk rg -n "R[0-9]{3}-|TASK-|CAP-|PF-|matrixRow|matrixRowForSection" packages/*/test examples/*/test specs --glob '!**/node_modules/**' --glob '!**/dist/**'
rtk rg -n "harness|proof|fixture|support" docs/standards docs/ssot specs skills --glob '!**/node_modules/**' --glob '!**/dist/**'
```

验收口径：

- `src/**` 命中必须逐项分类为 stable domain vocabulary、comment-only trace、internal-only retained harness 或 violation
- tests/specs/docs 命中允许存在，同时必须能解释为追溯 metadata 或 proof requirement
- 新增 harness 必须能通过文件名、目录和 notes 直接看出 owner、lifecycle 和 verification command

## 相关页面

- [Logix API Next Guardrails](./logix-api-next-guardrails.md)
- [Verification Control Plane](../ssot/runtime/09-verification-control-plane.md)
- [Docs Governance](./docs-governance.md)

## 当前一句话结论

Harness 是证明编排资产，不是运行时事实源；测试和 specs 可以保留编号追溯，生产源码、public surface 和 machine contracts 只表达最终 runtime 语义。
