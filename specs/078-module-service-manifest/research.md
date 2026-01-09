# Research: 078 Module↔Service 关系纳入 Manifest IR（平台可诊断/可回放）

## 现状与缺口

### 1) Module 已经能“声明 services”，但 Manifest 没有把它导出为 IR

- `Logix.Module.make` 的定义参数已包含 `services?: Record<string, Context.Tag<any, any>>`（反射字段，和 `meta/schemas/dev` 同类）。
- 但 `Reflection.extractManifest`（`packages/logix-core/src/internal/reflection/manifest.ts`）当前只导出：
  - `actions/effects/schemaKeys/logicUnits/meta/staticIr/...`
  - **没有**导出 services 相关信息，因此平台侧无法枚举 Module↔Service 关系。

### 2) Tag 的稳定字符串标识在仓库内有多处“各自实现”，存在漂移风险

- `packages/logix-core/src/internal/runtime/AppRuntime.ts` 有 `getTagKey(tag)`（`tag.key`/`tag._id`/`toString`）。
- `packages/logix-core/src/internal/root.ts` 有 `tagIdOf(tag)`（`tag.id`/`tag.key`）。
- 缺少一份权威的 `ServiceId` 规范与单点实现，导致：
  - 不同 IR/诊断路径对同一 Tag 可能产生不同字符串；
  - 平台侧 diff/聚合会产生噪声与误判。

### 3) Trial Run 目前只能“从错误消息里解析 missing service”，缺少端口级定位

- `trialRunModule` 会从错误文本解析 `Service not found: <id>` 并把缺失项落到 `missingServices`。
- 但它不知道“缺的是哪个模块的哪个端口”，无法给出 `moduleId + port + serviceId` 的极致诊断。

## 关键落点（代码事实）

- Module 定义反射字段：`packages/logix-core/src/Module.ts`（`MakeDef.services` + `base.services = merged.services`）。
- Manifest IR：`packages/logix-core/src/internal/reflection/manifest.ts`（`ModuleManifest` + `manifestVersion=067` + digest）。
- Manifest diff：`packages/logix-core/src/internal/reflection/diff.ts`。
- Trial Run：`packages/logix-core/src/internal/observability/trialRunModule.ts`（report/environment/missing services 解析）。
- App assembly tag collision：`packages/logix-core/src/internal/runtime/AppRuntime.ts`（`provideWithTags` + `validateTags`）。

## 关键决策

### Decision 1：把 `ModuleDef.services` 定义为“输入依赖端口声明”

- `services` 的 key 是端口名（展示名/定位锚点）。
- value 是 `Context.Tag`（服务 Token）。
- 运行时不自动推断依赖；平台以显式声明为准（避免静态分析/反编译引入不确定性）。

### Decision 2：Manifest 增量字段 `servicePorts`，并纳入 version + digest + diff

- `ModuleManifest.servicePorts = Array<{ port: string; serviceId: string }>`（排序稳定）。
- bump `manifestVersion` 并让 `servicePorts` 进入 digestBase，保证：
  - 变更可门禁化；
  - 平台侧可稳定 diff。

### Decision 3：定义 `ServiceId` 的权威生成规则，并在仓库内单点实现

- `ServiceId` 是一个稳定字符串，用于跨模块聚合与对齐。
- 规则：优先 `tag.key`，其次 `tag.id`，再次 `tag._id`；**不接受** `tag.toString()` 作为 IR 的 `ServiceId` 来源（仅允许用于 dev 诊断展示）。
- 该规则必须在 `contracts/service-id.md` 固化，且所有 IR/诊断路径复用同一 helper，禁止复制粘贴各写一套。

### Decision 4：缺失诊断以“端口对齐检查”为主，不依赖业务代码是否访问到服务

- 在试运行装配完成后，对每个声明端口执行一次 root-level resolve 检查（不引入业务副作用）。
- 产出结构化缺失项：`{ moduleId, port, serviceId }[]`。

## 替代方案与取舍

### A) 从 Effect 类型环境 `R` 反射依赖

不可行：`R` 是类型层信息，运行时不可枚举；强行实现会引入并行真相源（违背统一最小 IR）。

### B) 运行时全量捕获“每次 Tag 读取”

风险高：Effect Env 读取发生在库内部，难以可靠拦截；强行做会侵入核心路径并引入不可控性能税。

### C) 静态分析扫描源码中的 Tag 使用

复杂且不稳定：需要解析 TS/JS、处理别名/间接引用/条件分支；并行真相源风险高。本特性不做。

### D) Hybrid Loader Pattern（Loader Execution / Spy Context 收集 `$.use`）

思路：把“加载（Load/Import）”视为一次受控的微型执行。平台在加载 Module/Logic 时，为运行时注入一个 Spy Context（或等价机制），当逻辑在初始化/装配阶段发生 `$.use(Tag)` 时，Spy 自动记录“该 Tag 被使用过”，据此生成/补全 `servicePorts`。

优点：

- 不依赖完整 AST 推断：能捕获隐藏在 helper/封装层里的 `$.use` 调用（只要最终会触发 `$.use`）。
- 适合做“建议生成器”：为业务侧生成初版 `services` 声明，减少手写成本。

局限与风险（使其难以成为权威真相源）：

- **覆盖不完备**：只覆盖被执行到的分支；条件分支/惰性路径不触发就收集不到（与 Trial Run 的覆盖问题同源）。
- **执行带来副作用风险**：即使目标是“无副作用加载态”，现实中模块初始化/逻辑构造仍可能意外触发 IO；需要严格治理与隔离策略。
- **确定性与可复现性压力**：Loader 过程引入更多运行期因素（环境/条件/代码路径），容易使“依赖清单”与实际发生漂移。

结论：该方案适合作为 **evidence / suggestion**（辅助生成与校验），但不适合作为平台对齐与回放的 **权威 Static IR**。因此本特性仍以“显式声明 → Manifest 导出 → 对齐检查”为主线；Loader/TrialRun 采集可作为后续增强或独立特性拆出。

## 风险与缓解

- **Tag 标识不稳定**：要求业务侧创建 Tag 时使用稳定字符串 key；在 dev 下对不合格 Tag 给出明确诊断。
- **Manifest 体积膨胀**：沿用 Manifest budgets（`maxBytes`）并制定裁剪顺序，确保 servicePorts 不被裁剪到不可用。
- **Devtools 注册表无界增长**：dev-only + 版本上限（类似 `ModuleTraitsRegistry` 的策略）。

## 本阶段结论

本特性应以“显式声明 → Manifest 导出 → Trial Run 对齐 → Devtools 展示”的最小闭环为主线交付，并以 `ServiceId` 规范化与版本化 digest 作为防漂移硬锚点。
