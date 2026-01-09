# Data Model: 045 Dual Kernel Contract（当前内核 + core-ng）

本文件定义本特性的核心实体、字段与关系，用于指导后续 `plan.md` → `tasks.md` → 实现阶段的落点收敛。

## 目标视图（高层）

- **上层（`@logixjs/react`/平台/Devtools/Sandbox）**：只依赖 `@logixjs/core` 的公共 API 与 Kernel Contract（统一最小 IR + 稳定锚点）。
- **内核实现（当前内核 / core-ng）**：以“可注入的 Runtime Services/Kernel”形式被装配进 runtime。
- **证据与对齐**：所有实现都必须产出同一套 Static IR + Dynamic Trace（Slim、可序列化、可裁剪），用于解释与 diff。

## Key Entities

### 1) `KernelId`

用于唯一标识一个“内核实现族”的稳定 id。

- `KernelId`（string）
  - 约定值：
    - `core`：当前内核（`@logixjs/core` 自带默认实现）
    - `core-ng`：下一代内核（`@logixjs/core-ng` 提供实现）

### 2) `KernelImplementationRef`

用于证据/诊断中引用“**请求的内核族（requested kernel family）**”及其实现来源信息（Slim、可序列化、可裁剪）。

> 重要：`KernelImplementationRef.kernelId` 表示“请求的内核族”，**不是**“已全套生效”的证明。  
> 是否发生 fallback/混用 builtin、是否满足“宣称已切到 core-ng/准备切换默认实现”的全套切换门槛，必须结合 `RuntimeServicesEvidence` 判定（见 `spec.md` Clarifications 与 FR-003/FR-008）。

- `kernelId`: `KernelId`
- `packageName`: string（例如 `@logixjs/core` / `@logixjs/core-ng`）
- `packageVersion`: string（可选；用于调试/证据包展示）
- `buildId`: string（可选；用于本地/CI 对比时的可解释锚点）
- `capabilities`: ReadonlyArray<string>（可选；仅用于解释“哪些能力已实现”，不能作为语义分岔的隐式开关）

### 3) `KernelContract`

上层与内核之间的稳定契约边界（概念实体，不代表必须存在一个“单独的包”）。

该契约至少覆盖四类能力：

1. **Runtime assembly / lifecycle**：装配、启动、释放、隔离。
2. **Transaction engine**：事务窗口、提交/回退、dirtyset/patch 记录边界。
3. **Derive/Converge engine**：派生收敛（或等价的“决定→执行”内核循环）。
4. **Observability**：Static IR 摘要与 Dynamic Trace 事件投影（Slim、可序列化）。

### 4) `KernelSelection`

描述“某个 runtime 选择了哪套内核实现，以及来源是什么”。

- `kernel`: `KernelImplementationRef`
- `source`: `'default' | 'explicit' | 'trialRun' | 'test'`
- `changed`: boolean（是否发生了默认选择之外的显式切换）

> 约束：选择应在 runtime 创建/装配时完成；禁止在事务/收敛热循环内动态分发。
>
> 语义提醒：这里的 `kernel.kernelId` 同样是“请求的内核族”；实际服务绑定与 fallback 解释线索在 `RuntimeServicesEvidence`。

### 5) `StaticIrSummary`

用于对齐与漂移检测的静态摘要（不会替代动态 trace）。

- `kernel`: `KernelImplementationRef`
- `contractVersion`: string（契约版本；用于解释“字段含义/shape”而不是代码版本）
- `runtimeOptionsSummary`: object（可裁剪；仅保留影响语义/性能边界的关键旋钮）
- `moduleBlueprintSummary`: object（可裁剪；只做摘要，不做全量导出）

### 6) `DynamicTrace`

运行时事件序列（统一最小 IR 的动态部分），必须满足：

- Slim、可序列化、可裁剪
- 稳定锚点：`instanceId/txnSeq/opSeq/...`
- 能解释：
  - 为什么触发（source）
  - 哪个实例/事务/操作
  - 发生了什么（kind）
  - 当前内核选择（至少在 runtime init / trial-run summary 中可关联到 `KernelImplementationRef`）

### 7) `RuntimeServicesEvidence`（既有证据：可直接复用）

用于解释“当前 runtime 的关键内核服务选择”。

- 代码落点：`packages/logix-core/src/internal/runtime/core/RuntimeKernel.ts`（生成/挂载）与 `packages/logix-core/src/internal/runtime/core/ModuleRuntime.ts`（构造期附加）
- 语义：对一组稳定 `serviceId` 记录最终选择的 `implId/implVersion/scope`，并提供 `overridesApplied` 解释链路。

> 约束：`RuntimeServicesEvidence` 是“细粒度选择证据”，`KernelImplementationRef` 是“高层内核族引用”。两者都必须可序列化，且不得在 diagnostics=off 场景引入额外热路径成本。

## Relationships

- 一个 **runtime** 在其生命周期内固定一个 `KernelSelection`（运行期不热切换）。
- 一个 **RunSession/TrialRun** 产生：
  - 一个 `StaticIrSummary`
  - 一段 `DynamicTrace`
  - （可选）契约一致性验证结果（差异报告）
- Devtools/Sandbox 只消费统一最小 IR，不关心“实现细节/内部对象图”。

## Non-goals（本特性不建模）

- 跨内核共享同一实例/同一 DI 树的状态（复杂且高风险，迁移阶段不需要）。
- 在 off 档位保留抽样诊断（属于独立特性/口径，避免污染本特性心智模型）。
