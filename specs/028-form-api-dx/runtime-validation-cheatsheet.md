# Cheat Sheet: Form 校验背后运行链路（触发 / 增量 / 写回 / 诊断）

> 目的：把“表单校验为什么是可控的、增量的、可解释的”固化成一份可查字典的小抄。  
> 范围：028 推荐路径下的 `@logix/form` + `@logix/core`（StateTrait / TraitLifecycle）当前实现口径。

## 0) 一屏 TL;DR（先记结论）

1. **deps 是唯一依赖事实源**：Graph / ReverseClosure / 增量校验 / 诊断解释都只认 `deps`。  
2. **触发是 action→scopedValidate**：`setValue/blur/submit` 由 `Form.install` 映射为 `TraitLifecycle.scopedValidate`。  
3. **增量靠 ReverseClosure**：给定 target（field/list/item/root），只跑“target + 所有依赖它的下游 check”。  
4. **门控靠 validateOn + RULE_SKIP**：自动校验阶段（onChange/onBlur）不该跑就 `RULE_SKIP`；`submit/manual` 永远执行。  
5. **RULE_SKIP ≠ undefined**：`RULE_SKIP` 表示“本次没跑”，不会清掉已有错误；`undefined` 才表示“跑了且通过”，会清错。  
6. **错误有三路真相源**：`$manual > rules > $schema`；schema 兜底只在 `controller.validate/handleSubmit` 里跑。  
7. **list-scope 写回是“按 key 增量”**：跨行规则必须显式 `deps`（如 `items[].sku`），写回只触达相关列，不扫/不清其它列。  
8. **行身份靠 trackBy / rowIdStore**：`errors.<list>.rows[i].$rowId` 用于稳定对齐；无 trackBy 可能降级为 index（trace 会给提示）。  
9. **诊断事件是 trace 证据**：`trace:trait:validate`（选了多少 check、为何范围变大）+ `trace:trait:check`（list 扫了多少行、耗时）。  
10. **压力控制的关键开关**：把“重规则”（跨行/扫描）限制在 `validateOn=["onBlur","onSubmit"]`，避免提交后 onChange 热路径失控。

---

## 1) 术语与对象（看到名字就能定位）

### 1.1 ValidateMode（触发语义）

- `valueChange`：对应 UI `setValue`（输入/变更）；可能 debounce。
- `blur`：对应 UI `blur`（失焦）；通常立即跑。
- `submit`：提交；必须全量执行 rules（不受 validateOn 限制）。
- `manual`：手动触发（`controller.validate/validatePaths`）；必须执行（不受 validateOn 限制）。

关键落点：
- `packages/logix-form/src/logics/install.ts`（action→mode）
- `packages/logix-core/src/internal/state-trait/validate.ts`（mode 在规则 ctx 中可见）

### 1.2 ValidateTarget / FieldRef（scope 表达）

`TraitLifecycle.Ref.*`（可序列化、可比较）：
- `Ref.field("a.b")`
- `Ref.list("items")`
- `Ref.item("items", 37, { field: "sku" })`
- `Ref.root()`
- `Ref.fromValuePath("items.37.sku")`：把 valuePath 解析成 field/list/item/root

关键落点：`packages/logix-core/src/internal/trait-lifecycle/index.ts`

### 1.3 Graph 节点命名（pattern 化）

运行时依赖图用“pattern 路径”表达 list item scope：
- valuePath：`items.37.sku`
- pattern：`items[].sku`

校验 scope 的 `fieldPath` 也用 pattern 表达：
- list-scope：`items`
- item-scope：`items[]`

关键落点：`packages/logix-core/src/internal/state-trait/validate.ts`（`toPatternPath` / `toGraphTargets`）

---

## 2) 触发链路（从一次输入开始）

### 2.1 UI 事件如何变成 scopedValidate

默认 wiring 由 `Form.install` 完成：
- `setValue(path)` → `scopedValidate(mode="valueChange", target=Ref.fromValuePath(path))`
- `blur(path)` → `scopedValidate(mode="blur", target=Ref.fromValuePath(path))`
- `submit` → `scopedValidate(mode="submit", target=Ref.root())`

关键落点：`packages/logix-form/src/logics/install.ts`

### 2.2 什么时候会触发（两阶段 + 规则白名单）

**表单级**：
- 提交前：`validateOn`（默认 `["onSubmit"]`）
- 提交后：`reValidateOn`（默认 `["onChange"]`）
- 阶段由 `$form.submitCount` 决定

**规则级**：
- 规则可显式声明 `validateOn:["onChange"|"onBlur"]`（只影响自动校验阶段）
- 任意规则显式声明了某个 trigger，会让 wiring 打开对应 action（避免“规则想在 blur 跑，但 form 没开 blur 导致永远不触发”）

关键落点：
- `packages/logix-form/src/form.ts`（`wrapTraitsForValidateOn` 收集 `rulesValidateOn`）
- `packages/logix-form/src/logics/install.ts`（`wantsChange/wantsBlur` 与 `shouldValidateNow`）

### 2.3 入口差异速查（最常见的“为什么没跑 / 为什么跑了”）

- `form.submit()` / 派发 `submit` action：**只触发 rules 的 root scopedValidate**（`mode="submit"`），**不跑 schema**。  
- `controller.handleSubmit(...)`：先跑 **rules root**，再跑 **schema decode** 写 `errors.$schema`，最后按 `$form.errorCount` 分流 `onInvalid/onValid`。  
- `controller.validate()`：`mode="manual"` 跑 **rules root**，再跑 **schema decode** 写 `errors.$schema`（用于“手动兜底 / i18n 切换后重刷 message”等）。  
- `controller.validatePaths(paths)`：对每个 path 做一次 **scopedValidate(mode="manual")**：  
  - 若当前值是数组 → target 为 `Ref.list(path)`（同时命中 list-scope + item-scope）  
  - 否则 → target 为 `Ref.fromValuePath(path)`（field 或 item）  

关键落点：`packages/logix-form/src/form.ts`（`controller.validate/validatePaths/handleSubmit`）

---

## 3) 增量范围（ReverseClosure：为什么不会全量跑）

### 3.1 deps → Graph 边 → ReverseClosure

构图阶段（build）会把每条 trait 的 `deps` 写入 Graph 边：
- `check-dep: dep -> fieldPath`
- 运行时对 target 求 reverse-closure：从 target 出发，沿“谁依赖我”方向扩散，得到最小需执行集合。

关键落点：
- `packages/logix-core/src/internal/state-trait/build.ts`（从 deps 产出 Graph.edges）
- `packages/logix-core/src/internal/state-trait/graph.ts` / `reverse-closure.ts`
- `packages/logix-core/src/internal/state-trait/validate.ts`（`scopesToValidate` 计算）

### 3.2 target 到图节点的映射（list/item 的特殊性）

- `field("a.b")` → `["a.b"]`
- `item("items", 37, { field: "sku" })` → `["items[].sku"]`（只命中 item-scope 下相关依赖）
- `list("items")` → `["items", "items[]"]`（list-scope + item-scope 都可能受影响）
- `root` → 全量（所有 check scope）

关键落点：`packages/logix-core/src/internal/state-trait/validate.ts`（`toGraphTargets`）

### 3.3 “只校验某一行”的实现细节（indexBindings）

非 root 校验时：
- item target 会被收集为 `indexBindings: Map<listPath, Set<index>>`
- item-scope（`items[]`）校验只遍历绑定的 index（而不是扫整列）

关键落点：`packages/logix-core/src/internal/state-trait/validate.ts`（`extractIndexBindings`）

### 3.4 Phase 2 限制（避免对“深层 list”产生误解）

- `TraitLifecycle.Ref.fromValuePath(...)` 支持把多层 index 解析为 `listIndexPath`（协议层已预留）。  
- 但当前 state-trait validate 的实现 **尚未消费 `listIndexPath`**，并且 item-scope 逻辑明确标注为“Phase 2：仅支持最浅层 `items[]`”。  
- 结论：**深层 list 的递归 identity / scoped validate / 写回/诊断** 仍需按 `tasks.md`（`T044/T045`）补齐实现后才能视为“跑通”。  

---

## 4) 门控语义（validateOn / reValidateOn / RULE_SKIP）

### 4.1 自动校验阶段：wrapRule 统一门控

`Form.make` 会把 trait 上的 check 规则包一层：
- `mode in ("submit"|"manual")`：永远执行
- `mode=valueChange`：视为 `onChange`
- `mode=blur`：视为 `onBlur`
- 若规则显式 `validateOn`：只按规则自己的白名单决定跑不跑
- 否则按表单阶段策略（`validateOn` vs `reValidateOn`）决定跑不跑

关键落点：`packages/logix-form/src/form.ts`（`wrapTraitsForValidateOn`）

### 4.2 RULE_SKIP 的关键区别（避免“误清旧错误”）

- `RULE_SKIP`：本次不参与执行（例如不在本阶段触发）。**不会**清理既有错误。
- `undefined`：执行后通过。会清理对应错误。

关键落点：`packages/logix-core/src/internal/state-trait/validate.ts`（`RULE_SKIP` 处理）

---

## 5) 写回错误树（errors.*）与优先级

### 5.1 三路错误的落点与优先级

- 手动：`errors.$manual.<path>`（`controller.setError`）
- rules：`errors.<path>`（StateTrait check 写回）
- schema：`errors.$schema`（`Schema.decodeUnknownEither(valuesSchema)` 映射后写回）

优先级约定：`$manual > rules > $schema`

关键落点：
- 写回：`packages/logix-core/src/internal/state-trait/validate.ts`
- 手动/schema：`packages/logix-form/src/form.ts`（`setError`、`handleSubmit/validate`）
- 文档口径：`specs/028-form-api-dx/quickstart.md`（schema vs rules）

### 5.2 setValue 的“错误清理”语义

对某个 valuePath 写值时：
- 会清掉同 path 的 `$manual` 与 `$schema`（避免旧错误粘在新值上）
- rules 错误不在 reducer 里清理：交由增量校验在合适时机清理（避免“没跑校验就清错”）

关键落点：`packages/logix-form/src/form.ts`（`reducers.setValue`）

### 5.3 list-scope 写回：只改动 deps 触达的列

list-scope 规则输出支持：
- `Array<rowPatch>`：表示 rows
- `{ $list?, rows? }`：同时给 listError 与 rows
- 其它非空值：视为 `$list` 错误

写回时会根据规则 deps 推导 `touchedKeys`，只更新这些 key 对应的列；不会清掉其它列的错误。

关键落点：`packages/logix-core/src/internal/state-trait/validate.ts`（`evalListScopeCheck` / `touchedKeys` / row patch 应用）

### 5.4 errorCount：O(1) validity 与增量一致性

`$form.errorCount` 表示 errors 树中错误叶子数量（含 `$manual/$schema`），由写回边界做增量维护，避免 UI 扫描整棵树。

关键落点：
- `packages/logix-form/src/form.ts`（reducers 增量维护 `$form.errorCount`）
- `packages/logix-core/src/internal/state-trait/validate.ts`（trait-check 写回时的 delta）

---

## 6) 诊断链路（trace 证据：可解释且可关）

### 6.1 什么时候会产出 trace

StateTrait validate 会读取当前 diagnostics level：
- `off`：不产出 trace（接近零成本）
- `light/full`：产出 `trace:*` 事件

关键落点：`packages/logix-core/src/internal/state-trait/validate.ts`（`Debug.currentDiagnosticsLevel`）

### 6.2 关键事件（建议先看这两个）

- `trace:trait:validate`：一次 validate 的概要（mode、请求数、选中 check 数、是否 root）
- `trace:trait:check`：list-scope 规则的运行摘要（scannedRows、affectedRows、changedRows、durationMs、rowIdMode、degraded…）

事件结构定义：`packages/logix-core/src/internal/runtime/core/DebugSink.ts`

---

## 7) 压力场景走读（索引示例）

> 目标：演示“200 行 + 条件必填 + 跨行唯一性”的链路如何仍保持可控与可解释。

### 7.1 场景配置（关键开关）

- `items`：200 行，`identityHint.trackBy="id"`
- 表单级：`validateOn=["onSubmit"]`，`reValidateOn=["onChange"]`，`debounceMs=150`
- 重规则（跨行扫描）：`items` list-scope `uniqueSku`，显式 `validateOn=["onBlur","onSubmit"]`，`deps=["items[].sku"]`
- 轻规则（行内）：`qtyPositive/priceNonNegative` 显式 `validateOn=["onChange"]`（仅影响本行）

### 7.2 操作序列（你可以按这个去对照 trace）

#### Step A：连续输入 `items.37.quantity`（多次 setValue）

- 触发：`setValue("items.37.quantity")` → debounce 后 `scopedValidate(mode="valueChange", target=item("items",37,{field:"quantity"}))`  
- GraphTargets：`["items[].quantity"]`  
- ReverseClosure：命中 `items[]`（行内规则），不会命中 `items`（跨行规则只依赖 `items[].sku`）  
- 执行：只遍历 index=37；`qtyPositive/priceNonNegative` 可跑，`skuRequired/warehouseRequired` 多数会 `RULE_SKIP`  
- 写回：`errors.items.rows.37.quantity`（并维护 `$form.errorCount` 增量）  
- 诊断：`trace:trait:validate`（selectedCheckCount≈1，mode=valueChange）

#### Step B：输入 `items.37.sku`（不 blur）

- 触发：同上，但 target field 为 `sku`  
- GraphTargets：`["items[].sku"]`  
- 执行：跨行 `uniqueSku` 因 `validateOn=["onBlur","onSubmit"]` 在 `valueChange` 下 `RULE_SKIP`；因此**不会扫 200 行**  
- 写回：多数情况下不变（除非你也配了 sku 的 onChange 轻规则）

#### Step C：blur `items.37.sku`

- 触发：`blur("items.37.sku")` → `scopedValidate(mode="blur", target=item("items",37,{field:"sku"}))`（通常立即）  
- ReverseClosure：命中 `items[]`（行内 skuRequired）+ `items`（跨行 uniqueSku）  
- 执行：  
  - item-scope：只跑 index=37（轻）  
  - list-scope：扫 200 行做唯一性检查（重，但被限制在 blur/submit）  
- 写回：只触达 `errors.items.rows[*].sku` 这一列（基于 deps 推导 touchedKeys），不会影响其它列错误  
- 诊断：`trace:trait:check`（scannedRows=200、durationMs、changedRows…），可用于解释“为什么这次重”

#### Step D：第一次提交 `controller.handleSubmit(...)`

- rules：`scopedValidate(mode="submit", target=root)`（全量 rules）  
- schema：`Schema.decodeUnknownEither(valuesSchema)` → 写 `errors.$schema`  
- 分流：读取 `$form.errorCount` 决定 `onInvalid/onValid`  

#### Step E：提交后继续改值（`submitCount>0`）

- 对“未显式 rule.validateOn”的规则：会按 `reValidateOn=["onChange"]` 在输入时增量校验（更即时反馈）。  
- 对“显式限制为 blur/submit 的重规则”：仍不会进入 onChange 热路径（避免提交后性能雪崩）。

---

## 8) 作者侧检查清单（避免“性能/诊断漂移”）

1) **每条规则都写对 deps**：规则里读了谁，就把谁写进 deps（否则 ReverseClosure/诊断都会失真）。  
2) **重规则不要默认 onChange**：跨行/扫描类规则用 `validateOn=["onBlur","onSubmit"]`；提交后也不应变热。  
3) **list-scope deps 用 `items[].field`**：让写回能锁定 touchedKeys（避免误清/误写）。  
4) **list 必配 trackBy**：否则 `$rowId` 可能降级为 index；诊断会提示降级，但业务体验会受影响。  
5) **只靠 schema 是兜底，不是交互态校验**：schema 错误写在 `$schema`，不参与 rules 的增量触发/trace 链路。
