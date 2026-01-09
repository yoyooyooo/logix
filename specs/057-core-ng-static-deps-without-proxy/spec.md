# Feature Specification: ReadQuery/SelectorSpec + SelectorGraph（静态 deps / 无 Proxy）

**Feature Branch**: `057-core-ng-static-deps-without-proxy`  
**Created**: 2025-12-28  
**Status**: Complete  
**Input**: User discussion: "NG-first / compiler-first；继续允许函数 selector（如 useSelector/fromState），但编译期尽可能静态化；对象字面量 selector 默认 struct memo 复用引用；三段式车道 AOT(可选)→JIT(默认)→Dynamic(兜底)；dynamic 回退必须可观测且可在 strict gate 下失败；Devtools 要清晰区分静态/动态车道。"

**Acceptance**: `specs/057-core-ng-static-deps-without-proxy/acceptance.md`

## Terminology

- **ReadQuery / SelectorSpec（状态读取查询）**：描述“读哪些状态依赖（deps/reads）+ 如何投影成结果（select）+ 如何比较（equals）”的可编译协议。
- **SelectorId**：稳定、可序列化的 selector 标识；用于 Static IR / Dynamic Trace 对齐与 diff；static lane 必须可复现（由 reads/shape 等稳定输入导出）。
- **deps / reads**：该 selector 声明的依赖集合（初期：canonical fieldPath string；未来可升级为 pathId:number）；JIT 子集只产出 string reads；无法静态化时进入 dynamic lane。
- **lane（读状态车道）**：至少区分 `static` 与 `dynamic`；可扩展标注 `producer`（`aot|jit|manual`）与 `fallbackReason`。
- **readsDigest**：对标准化后的 reads 集合计算的摘要（`count + hash`），用于 Devtools 聚合与证据对齐（避免在 light 档位塞入完整 reads）。
- **selectorFn 元数据（兼容输入）**：允许在函数对象上挂载 `debugKey?: string` / `fieldPaths?: string[]`（字符串 key；debugKey 为空可回退到函数名），作为“无插件仍可用”的声明式输入来源之一。
- **Struct Memo（复用引用）**：对 struct selector（典型：返回对象字面量）做字段级 memo：字段未变则复用同一对象引用。
- **SelectorGraph**：按 module instance 维护的“依赖索引 + 缓存 + 精准通知”结构：commit 时基于 dirtyRoots/dirtyPaths 决定重算哪些 selector。
- **Strict Gate**：CI / perf gate 等关键验证场景下，把 `dynamic`（或特定 fallbackReason）升级为失败，确保静态车道覆盖率可控。

## Clarifications

### Session 2025-12-28

- Q: 这里的 ReadQuery/SelectorSpec 是否等同于领域层 `@logixjs/query`？ → A: 不等同。ReadQuery 只描述“读状态依赖与投影”，服务于渲染/派生/订阅与可解释性；领域 Query 仍负责“服务调用/缓存/请求”等。
- Q: 不安装任何编译插件时是否仍可用？ → A: 必须可用。默认走 Runtime JIT；无法静态化时回退到 dynamic，但回退必须可观测/可审计，并在 strict gate 下可变为失败。
- Q: 当 `StrictGate.mode='error'` 时，如果没有配置 `requireStatic`，strict gate 默认如何判定？ → A: 默认全局生效：任一 selector 一旦进入 `dynamic` lane 即 FAIL；`requireStatic` 仅用于缩小 gate 覆盖范围（否则视为全覆盖）。
- Q: JIT 静态化的“可解析子集”是否需要同时支持 `=>` 与 `function (...) { return ... }` 两种等价形态？ → A: 需要。JIT 子集至少支持这两种形态（仍严格限定为安全的纯取路径/对象字面量投影子集），避免静态覆盖率被编译/转译形态放大影响。
- Q: strict gate 的 `requireStatic` 应该以什么作为主匹配键（SSoT）？ → A: 以 `selectorId` 为主（SSoT）；`debugKey` 仅用于展示/报错辅助，不作为判定主键（避免压缩/冲突导致误杀）。
- Q: `fallbackReason` 是否要冻结为最小枚举（避免 Devtools/StrictGate 漂移）？ → A: 要冻结：`missingDeps | unsupportedSyntax | unstableSelectorId`，且不得随意新增自由字符串；需要扩展时必须更新 spec/contracts。
- Q: perf evidence 的采集隔离要求是否要对 NG 相关 specs（至少 048/057）统一强制？ → A: 强制统一：所有 `$logix-perf-evidence` 的 Node+Browser before/after/diff 必须在独立 `git worktree/单独目录` 中采集；混杂工作区结果仅作线索，不得用于宣称 Gate PASS。
- Q: perf evidence 的 suites/budgets 的单一事实源（SSoT）怎么定？ → A: 统一以 `.codex/skills/logix-perf-evidence/assets/matrix.json` 为 SSoT（至少覆盖 `priority=P1`），并以 `matrixId+matrixHash` 保证可比性；硬结论至少 `profile=default`。
- AUTO: Q: selectorFn 元数据的字段名与读取规则是什么？ → A: runtime 只读取函数对象上的 `debugKey?: string` 与 `fieldPaths?: string[]`（debugKey 为空可回退到函数名）；不引入 Symbol key。
- AUTO: Q: JIT 静态化的最小子集边界如何定义？ → A: 仅支持单参数 `=>`/`function(){return}`，且 body 只能是 `s.a.b` 或 `{ k: s.a, ... }`（key 必须是标识符、value 只能是点路径）；其它一律 dynamic，并以 `fallbackReason=unsupportedSyntax` 证据化。
- AUTO: Q: reads 的最小表示与语法（无 Proxy）怎么定？ → A: 初期 reads 使用 canonical 的 fieldPath string（点分标识符段；不含 bracket/index），number 仅作为未来 pathId 预留；JIT 子集只产出 string reads。
- AUTO: Q: selectorId 的稳定性来源怎么定（避免源码/函数名漂移）？ → A: static lane 的 selectorId 必须仅由“标准化后的 reads/shape”等稳定输入导出（可复现、可序列化）；dynamic lane 可用 `debugKey+source` 生成 best-effort id，但必须可被 strict gate 以 `unstableSelectorId` 拦截。
- AUTO: Q: `unstableSelectorId` 何时触发？ → A: 当无法从 reads/shape 生成稳定 id，且 `debugKey` 缺失或 `selector.toString()` 退化为 `[native code]` 等低区分度来源导致高碰撞风险时，必须标记为 `fallbackReason=unstableSelectorId`（strict 下可 FAIL，且不得启用 selectorGraph 缓存）。
- AUTO: Q: struct memo 的默认语义怎么定？ → A: 对 JIT 子集识别的 struct selector（对象字面量投影），默认 `equalsKind=shallowStruct`：字段按 `Object.is` 比较，全等则复用前一次对象引用；不要求用户传 shallow compare。
- AUTO: Q: strict gate 的判定时机与锚点如何定义？ → A: strict gate 在 selector 编译/注册阶段即判定（无需等待 render）；失败输出允许使用 `txnSeq=0` 表示 assembly，并必须包含 `moduleId/instanceId/txnSeq + selectorId + debugKey? + fallbackReason`。
- AUTO: Q: Devtools 侧 “debugKey/selectorKey” 命名如何统一？ → A: 对外规范统一称 `debugKey`；若现有 on-wire 字段为 `selectorKey`，则视为 `debugKey` 的同义别名，投影/文档均以 `debugKey` 表达。

## Related (read-only references)

- `specs/045-dual-kernel-contract/`（Kernel Contract：统一最小 IR + 证据门禁 + 对照验证跑道）
- `specs/046-core-ng-roadmap/`（路线总控：里程碑与 spec registry）
- `specs/016-serializable-diagnostics-and-identity/`（稳定锚点与可序列化证据）
- `docs/reviews/07-phase3-react-1p1gt2.md`（concept：SelectorSpec/SelectorGraph 与 txn→selector→render 因果链）

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 继续允许函数 selector，但尽量静态化 (Priority: P1)

作为业务开发者，我希望仍然可以写最常见的函数 selector（`(s) => s.count` / `(s) => ({ a: s.a, b: s.b })`），并且在可能的情况下自动进入静态车道；即使没装编译插件也能正常工作，只是在无法静态化时回退到 dynamic（且可观测）。

**Acceptance Scenarios**:

1. **Given** `useSelector(handle, (s) => s.count)`，**When** 系统分析 selector，**Then** 能产出 `deps=["count"]`（或等价 PathId）并进入 `static` lane（producer=aot 或 jit）。
2. **Given** `useSelector(handle, (s) => ({ count: s.count, age: s.age }))`，**When** `count/age` 未变化但发生其它字段变更，**Then** 返回对象引用必须复用（struct memo），以避免无意义重渲染（默认不要求用户传 `shallow`）。
3. **Given** selector 含动态分支/外部函数调用导致无法静态化，**When** 运行，**Then** 回退到 `dynamic` lane，且 Devtools/证据中包含 `fallbackReason`。

---

### User Story 2 - Devtools 清晰区分车道并解释降级 (Priority: P1)

作为 Devtools/Sandbox 维护者，我希望能在不依赖日志的情况下解释“某个 selector 为什么会重算/为什么走 dynamic”，并能把 selector 的计算与事务（txnSeq/txnId）对齐到同一条因果链。

**Acceptance Scenarios**:

1. **Given** 同一 module instance 的多次事务，**When** 导出统一最小 IR，**Then** 能看到 selector 的 `selectorId`、`lane`、`deps`（若有）、`fallbackReason`（若有），并能与事务锚点对齐（`moduleId/instanceId/txnSeq`；`opSeq` 可选）。
2. **Given** 发生 dynamic 回退，**When** 打开 Devtools，**Then** 能一眼看出“哪些 selector 是 dynamic、比例是多少、造成的重算成本是什么”。

---

### User Story 3 - SelectorGraph 精准通知与缓存 (Priority: P1)

作为运行时维护者，我希望把“订阅/重算”从“每次 commit 重算所有 selector”升级为“只重算 deps 受影响的 selector”，并且缓存 selector 结果与成本统计，以支撑性能治理与可解释性。

**Acceptance Scenarios**:

1. **Given** dirtyRoots 不与某 selector 的 deps 重叠，**When** commit，**Then** 该 selector 必须零计算/零重算。
2. **Given** deps 受影响，**When** commit，**Then** selector 至多重算一次并更新缓存；同时可输出 Slim 的 cost 摘要（在 diagnostics=light/sampled/full）。

---

### User Story 4 - Strict Gate（静态车道覆盖率可控） (Priority: P2)

作为仓库维护者，我希望在 CI/perf gate 中能把 dynamic 回退当成失败（或至少对指定 selector/模块失败），以避免“以为已静态化但其实在跑动态”的误判。

**Acceptance Scenarios**:

1. **Given** strict gate 开启，**When** 任一标记为必须静态化的 selector 发生 dynamic 回退，**Then** 以结构化失败阻断（失败输出至少包含 `moduleId/instanceId/txnSeq + selectorId + debugKey? + fallbackReason`）。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 定义对外可用的 ReadQuery/SelectorSpec 协议（`selectorId/deps/select/equals/debugKey`），并允许 `@logixjs/react` 与 `FlowRuntime.fromState` 使用该协议订阅状态变化。
- **FR-002**: 系统 MUST 支持“函数 selector 作为语法糖”：允许继续传函数 selector；若存在 AOT 插件产物/显式 ReadQuery，则优先进入 static；否则走 JIT 静态化；JIT 的最小子集限定为 “纯取路径（`s.a.b`）/对象字面量投影（`{ k: s.a, ... }`）”，并至少支持 `=>` 与 `function (...) { return ... }` 两种等价形态；超出子集必须回退 dynamic 且证据化 `fallbackReason`（避免隐式退化）。
- **FR-003**: 系统 MUST 为 struct selector 提供默认 struct memo：对对象字面量投影使用 `equalsKind=shallowStruct`（字段按 `Object.is` 比较），字段未变则复用对象引用；以消除“对象字面量导致永远变化”的常见陷阱。
- **FR-004**: 系统 MUST 引入 SelectorGraph（或等价机制）：以 commit meta（txnSeq/dirtyRoots/dirtyPaths）驱动精准重算与通知；不得以“每次 commit 重算所有 selector”作为长期默认策略。
- **FR-005**: 系统 MUST 在统一最小 IR 中可解释 “lane/deps/fallbackReason/selectorId”，并保证与事务锚点可对齐（`moduleId/instanceId/txnSeq`；`opSeq` 可选）。
- **FR-006**: 系统 MUST 提供 strict gate：可把 dynamic（或某些 fallbackReason）升级为失败，且失败必须结构化、可序列化、可复现（不依赖日志）；当 `mode='error'` 且未配置 `requireStatic` 时，默认视为“全覆盖”（任一 dynamic 即 FAIL），`requireStatic` 仅用于缩小覆盖范围；在编译/注册阶段即可判定并允许 `txnSeq=0` 表示 assembly。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: `diagnostics=off` 下新增能力必须接近零成本：不得引入常驻分配、不得在事务窗口内增加额外分支/解析。
- **NFR-002**: 事务窗口内禁止 IO/async；任何 selector 静态化/编译/缓存初始化必须发生在装配期或事务外。
- **NFR-003**: 任何关键改动 MUST 通过 `$logix-perf-evidence` 的 Node + Browser before/after/diff；证据采集必须隔离（独立 `git worktree/单独目录`），否则不得用于宣称 Gate PASS；并且 Devtools 必须能解释性能变化与 lane 覆盖率变化。

### Key Entities _(include if feature involves data)_

- **ReadQuery / SelectorSpec**
- **SelectorId**
- **SelectorGraph**
- **ReadLaneEvidence**（lane/deps/fallbackReason 的 Slim 可序列化证据）

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 对常见 selector（单字段读取、对象字面量 struct）能在 AOT/JIT 任一路径进入 static lane，且 struct memo 生效（不再依赖手写 shallow）。
- **SC-002**: Devtools/证据能清晰区分 static/dynamic，并能解释 dynamic 的原因与成本（包含稳定锚点）。
- **SC-003**: 在严格门禁下可阻断 dynamic 回退（结构化失败），避免静态化覆盖率误判。
