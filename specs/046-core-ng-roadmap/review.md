# Assessment: Core NG Roadmap (046) & Codebase Alignment

> Update 2025-12-31：本文件后半部分为 2025-12-28 的阶段性评估（已过期）；当前状态请以 `specs/046-core-ng-roadmap/roadmap.md` 与 `specs/046-core-ng-roadmap/spec-registry.json` 为准。

## 0. Update (2025-12-31)

- 046 registry（`specs/046-core-ng-roadmap/spec-registry.json`）：`done=16`、`frozen=3`（`053/054/055`）。
- 关键里程碑已达标：045/039/047/048/057/049/050/051/052/058/060/062（均 `done`）。
- P1 周边优化已达标：056/059（均 `done`，已回写 Node+Browser perf diff 证据）。
- 可选大路线收口：053（AOT artifacts）/054（Wasm planner）/055（flat store PoC）已标记 `frozen`，仅在证据触发条件满足时解冻启动。
- frozen 触发核对：053/054 已完成 Trigger Check 并保持 `frozen`；055 已完成 pilot 预选（仍保持 `frozen`）。

---

## Archive (2025-12-28)

**Date**: 2025-12-28
**Scope**: `specs/046-core-ng-roadmap`, `specs/045-dual-kernel-contract`, `packages/logix-core`

## 1. Executive Summary

`specs/046-core-ng-roadmap` 提供了清晰的 "Core NG" 长期演进方向与管理机制，但在代码层面，**基础性依赖 (Foundational Dependencies) 尚未落地**。目前仓库处于 "Spec Ready, Code Pending" 的状态。

- **Spec 完整度**: 高。046 定义了总控注册表 (Registry) 和里程碑 (Milestones)，045 定义了双内核契约的任务清单。
- **代码实现度**: 低。`packages/logix-core` 尚未包含 `KernelContract` 或 `KernelImplementationRef` 等核心抽象；`packages/logix-core-ng` 尚未创建。
- **主要风险**: 045 是所有 NG 工作的阻塞性前置 (Blocking Pre-requisite)。在 045 Phase 2 (Foundational) 完成前，046 描述的绝大多数高级特性 (M1.5+) 无法进入代码阶段。

## 2. Detailed Findings

### 2.1 Spec vs Codebase Gap

| Component                    | Spec Status                | Codebase Status | Gap Analysis                                                                                               |
| :--------------------------- | :------------------------- | :-------------- | :--------------------------------------------------------------------------------------------------------- |
| **046 Core NG Roadmap**      | Draft (Registry Available) | N/A (Meta Spec) | 作为总控文档已就绪，但其引用的里程碑均未达成。                                                             |
| **045 Dual Kernel Contract** | Implementing (Tasks Ready) | **Not Started** | `packages/logix-core` 无 Kernel 抽象；`logix-core-ng` 包不存在；`specs/045/contracts` 目录下无 TS 定义。   |
| **039 Integer Evidence**     | Implementing               | **Early Stage** | 核心路径 `converge` 仍基于 string/Map (verified via tasks check, code not fully transitioned to Exec IR)。 |
| **Toolchain (AOT/Vite)**     | Optional (P2)              | N/A             | 符合预期，代码库目前无强绑定 Vite，保持了 Pure JS/TS 形态。                                                |

### 2.2 Critical Path Analysis

根据 046 的规划，当前工作的关键路径如下：

1.  **[BLOCKER] 045 Phase 1 & 2**: 必须优先在 `logix-core` 中建立 `Kernel` 抽象与 `RuntimeServicesEvidence` 机制。这是 "NG 路线" 的物理入口。
2.  **[PARALLEL] 039 Evidence**: 在 045 建立契约的同时，需确保 039 的性能基线 (Before Evidence) 被固化，否则后续 NG 改造缺乏对比基准。
3.  **[PENDING] Core NG Implementation**: `logix-core-ng` 的实际代码开发需等待 045 契约点就绪。

### 2.3 Feasibility Check

- **可行性**: 046 提出的 "JIT-style 预编译" (M3/Phase 3) 在现有 `logix-core` 架构上是可行的，特别是 `packages/logix-core` 已经是 pure logic engine，无 DOM 耦合，适合做这种底层改造。
- **复杂度**: 最大的挑战在于 "Trial Run / Test / Dev" 场景下的**混合运行时 (Hybrid Runtime)** 状态管理 (Spec US2)。这要求 `Runtime.make` 必须严格支持显式 Kernel 注入，且 Devtools 协议需要升级以支持识别 Kernel ID (目前 Devtools 仅支持单一运行时假设)。

## 3. Recommendations (Next Actions)

1.  **立即启动 045 实现**: 不要等待 046 进一步完善，直接进入 `specs/045-dual-kernel-contract` 执行 Phase 1 (Create Package) & Phase 2 (Kernel Interface)。
2.  **固化 039 基线**: 在修改任何核心代码前，先运行 `pnpm perf` 确保 039 的 "Before" 证据落盘。
3.  **046 仅作为看板**: 保持 046 为只读/调度状态，定期更新 `spec-registry.json`（关系）与 `spec-registry.md`（阐述）即可，不需在该 spec 下编写 runtime 代码。

## 4. Conclusion

评估结论：**Roadmap Clear, Foundation Missing.**
建议用户批准进入 `specs/045-dual-kernel-contract` 的执行阶段 (Execution Mode)。
