# Research: 010 Form API（设计收敛与性能边界）

本文档用于把「动态列表 + 跨行规则」从 demo 写法收敛为可推导、可诊断、可优化的运行时能力，并明确：`StateTrait.list({ item, list })` 里 **两者都可以传 `StateTrait.node(...)`**，且我们要把它们“真正跑通到终态”。

## 现状结论（代码事实）

- `StateTrait.list({ item: StateTrait.node(...) })`
  - `item.source` ✅ 已支持（含 RowIdStore 门控、重排/插入后写回稳定）：`packages/logix-core/src/internal/state-trait/source.ts`
  - `item.check` ✅ 已支持（scoped validate flush + ReverseClosure）：`packages/logix-core/src/internal/state-trait/validate.ts`
  - `item.computed/link` ❌ 当前不支持：`converge` 写入路径不理解 `userList[].x`，会把 `userList[]` 当普通 key 写进 state（语义错误）
- `StateTrait.list({ list: StateTrait.node(...) })`
  - `list.check` ✅ 可运行（输入为整列数组），但当前 deps 归一化会把 `deps:["warehouseId"]` 变成 `userList.warehouseId`，导致 onChange 触发范围推导失真（需要 `listValidateOnChange` 兜底）

结论：类型/结构上“可以传 node”，但要达成终态（删除开关、跨行规则一次扫描多行写回、错误归属稳定、可诊断且不负优化）仍需补齐一组关键语义。

## Decision 1：跨行规则强制收敛为 list-scope check（唯一推荐写法）

- **Decision**：跨行互斥/唯一性/聚合类规则必须放在 `StateTrait.list({ list: StateTrait.node({ check }) })`；行内规则放在 `item.check`。
- **Rationale**：从结构上杜绝“每行扫全表”的 O(n²) 写法；为运行时增量触发/诊断/回放提供唯一事实源。

## Decision 2：list-scope deps 语义 = `userList[].<field>`（并自动补齐结构依赖）

- **Decision**：
  - list scope 下的 `deps: ["warehouseId"]` 语义为 `userList[].warehouseId`（build 阶段归一化）；
  - 同时为 list-scope check 自动补齐结构依赖（至少包含 `userList` 或 `userList[]` 之一），确保 append/remove/reorder 也会触发跨行规则刷新。
- **Rationale**：消灭 `Form.install.listValidateOnChange` 这类专家开关；让触发语义完全由 deps/IR 推导且可解释。
- **Note（对齐 009）**：`userList[].warehouseId` 仅是“业务/文档展示形态”；在事务 IR / dirty-set / patch / 诊断中，canonical FieldPath 使用段数组且不携带索引/`[]`，因此该依赖在 IR 中对应 `["userList","warehouseId"]`，结构变更（insert/remove/reorder）对应 `["userList"]` 根。

## Decision 3：错误树统一为 `$list/rows[]`（可序列化 + 可扩展）

- **Decision**：数组字段的错误节点统一使用：
  - `errors.<listPath>.$list`：列表级错误（可选）
  - `errors.<listPath>.rows[i]`：行级错误对象（可选空洞）
  - `errors.<listPath>.rows[i].$rowId`：行级稳定锚点（用于诊断/回放/重排对齐）
- **Rationale**：
  - 允许同时表达“列表级”与“多行级”错误；
  - 结构可序列化，适配平台/Devtools 的聚合展示；
  - 不要求业务理解内部形态：Form/React 层提供 valuePath → errorsPath 的映射（对外心智不变）。

## Decision 4：validate flush 必须避免“等价 churn”（防止负优化）

- **Decision**：
  - 校验写回必须具备结构化复用：未变化的行/字段复用旧引用，避免每次校验都产生新对象导致 React 全量重渲染；
  - list-scope check 的输出允许 O(n) 基线扫描，但写回必须只触及真正变化的 rows/keys（并记录可诊断摘要）。
- **Rationale**：否则“跨行校验”会把性能压力转移到渲染层，形成负优化。

## Decision 5：Form 层迁移（删除开关 + 数组动作也触发校验）

- **Decision**：
  - 删除 `Form.make`/`Form.install` 的 `listValidateOnChange`；
  - `arrayAppend/Prepend/Remove/Swap/Move` 需要触发 scoped validate（至少 list target），保证删除/重排后错误一致更新/清理。
- **Rationale**：跨行约束的正确性不能依赖“用户恰好又改了一次字段”。

## Decision 6（同场景必需）：`userList[].*` 的 computed/link 执行语义（用于声明式 linkage/reset）

- **Decision**：
  - 让 `converge` 支持对 `userList[].field` 形式的 computed/link 做逐行执行与写回；
  - 这是把 case11 里 UI 的多次 `setValue` 级联重置收敛为“事务内声明式派生”的基础。
- **Rationale**：联动/reset 若继续留在 UI 层，会破坏 dirty-set/因果链收敛，平台无法治理。

## Decision 7：稳定标识（rowId/instanceId/txnSeq/opSeq/eventSeq）与依赖关系（对齐 009）

- **rowId**：优先用 `identityHint.trackBy` 派生（字符串化或稳定 hash），避免 `Date.now/Math.random`；缺失 trackBy 时用可重建的单调序号（绑定到 runtime instance）。
- **instanceId/txnSeq/opSeq/eventSeq**：完全对齐 Spec 009：`instanceId` 必须外部注入；`txnSeq` 为 instance 内单调递增；`opSeq` 为 txn 内单调递增；`eventSeq` 为 instance 内单调递增；`txnId/opId/eventId` 必须可由上述字段确定性重建；诊断分档 `off/light/sampled/full` 的“是否写入缓冲区/载荷预算”以 009 为准。
- **nodeId/ruleId**：`nodeId` 必须可映射到 Static IR 节点；`ruleId` 建议稳定为 `<scope>#<ruleName>`（展示形态可用 `userList#uniqueWarehouse`）；`trait:check` 事件以 009 DynamicTrace.events 形式输出（`kind="trait:check"`），并在 payload 中携带 Trigger（kind+path+op）与 summary（scanned/affected/changed）。

## Decision 8：Form API 收口（Rules/Errors 的产物必须“可直挂、可降解”）

- **Decision**：
  - 业务/示例/文档默认只使用 `@logixjs/form` 的领域入口：`Form.make({ traits, derived })` + `Form.traits/Form.Rule/Form.Error/Form.Trait`，而不是直接写 `@logixjs/core` 的 `StateTrait.*`；
  - `Form.Rule.make(...)` 的返回值必须是**可直接挂到** `StateTrait.node({ check })` 的形态（即 `Record<ruleName, { deps, validate, meta? }>`），不得引入额外包壳（例如 `{ rules: ... }` 这种二次结构）；
  - `Form.Error.*` 只负责组织错误树形态（例如 `$list/rows[]`），不改变 kernel 语义，不引入第二套运行时；
  - `Form.Trait.*` 与 `StateTrait.*` 同形状，供 `derived` 声明联动/派生（默认写回 `values/ui`），仍可完全降解为 StateTraitSpec/IR；`Form.node/Form.list` 仅作为最小 escape hatch（示例默认用 `Form.traits` 组织片段）。
- **Rationale**：否则“Form 领域包”会变成“只换了名字的 StateTrait”，并产生文档/实现不一致与团队写法分裂（尤其是 list-scope 场景会被迫保留 `listValidateOnChange` 这类专家开关）。

## Decision 9：Schema/Resolver 默认只在 submit/root validate 运行

- **Decision**：
  - 默认 onChange/onBlur（高频）只运行 Rules（item/list），不运行 Schema/Resolver；
  - Schema/Resolver 默认只在 submit/root validate（低频）运行，并写回同一错误树；
  - 若业务显式开启 Schema onChange/onBlur，必须提供性能证据，并在诊断事件中可解释其开销与命中范围。
- **Rationale**：Schema parse/decoder 往往是全量形状校验，容易把热路径拖入负优化；Rules 以 deps/dirty-set 收敛范围更适合高频增量校验。

## Decision 10：Schema + Rules 冲突合并以 Rules 为准

- **Decision**：当 Schema 与 Rules 在同一路径产出错误时，最终写回以 Rules 为准（Schema 仅作为补充来源，不得覆盖 Rules 的业务语义错误）。
- **Rationale**：避免同一路径双写带来的 churn/冲突；同时保证业务语义错误优先展示，且仍可在诊断中保留 Schema 证据。

## Decision 11：数组 valuePath → errorsPath 规范映射（插入 `rows`）

- **Decision**：数组字段的 errorsPath 采用“插入 rows 段”的规范映射：`userList.0.x` → `errors.userList.rows.0.x`；列表级错误为 `errors.userList.$list`，行级锚点为 `errors.userList.rows.0.$rowId`。
- **Rationale**：对外保持 valuePath 心智不变；对内保证 `$list/rows[]` 是唯一错误树口径，并为 rowId 锚点与重排稳定性预留结构位置。

## Decision 12：reset(values?) 默认语义（清空 errors/ui，不隐式校验）

- **Decision**：`reset(values?)` 重置 values 为“提供值或 initialValues”，并清空 errors/ui（touched/dirty 归零），且不自动触发 validate（由 validate/handleSubmit 显式触发）。
- **Rationale**：reset 作为“回到干净初始态”的原语，避免隐式校验把 reset 变成热路径，并减少不可预期的写回与诊断噪音。

---

## Decision 13：ErrorValue 体积上界（Slim & 可序列化）

- **Decision**：ErrorValue 必须可 JSON 序列化，且 JSON 序列化后体积 ≤256B。
- **Rationale**：错误树是热路径数据结构与回放/诊断资产；限制体积可避免把大对象图塞进 state 导致 churn、不可控分配与 Devtools 负担；复杂信息应进入诊断事件（light/full）或业务侧映射层。

## Decision 14：`trait:check` 事件的产出档位（off 近零成本）

- **Decision**：`trait:check` 仅在 `Diagnostics Level=light|full` 产出；`Diagnostics Level=off` 不产出。
- **Rationale**：`off` 的验收目标是“接近零成本”，禁止为诊断目的在热路径引入额外对象分配与 O(n) 事件构造；而 `light/full` 才承担解释链路与证据聚合职责。

## Decision 15：`rowIdMode` 显式区分 runtime `rowIdStore`

- **Decision**：`trait:check.data.rowIdMode` 枚举为 `trackBy|store|index`，其中 `store` 表示 runtime `rowIdStore`（缺失 trackBy 的稳定 rowId 来源）。
- **Rationale**：避免把“业务稳定 id”与“运行时生成 id”混为一谈；让 degraded/迁移问题在诊断与回放中可解释、可定位、可量化。

## Decision 16：Schema 默认不进热路径时的错误清理语义

- **Decision**：当默认 onChange/onBlur 不运行 Schema/Resolver 时，同一路径发生 value 变更必须清理该路径下由 Schema 产生的错误（不重新运行 Schema）。
- **Rationale**：避免陈旧 Schema 错误残留阻塞 `isValid/canSubmit`，同时不把 Schema parse 引入热路径；最终正确性仍由 submit/root validate 兜底。

## Decision 17：SC-002 的验收诊断口径

- **Decision**：`SC-002`（50ms@100 行）仅在 `Diagnostics Level=off` 下验收；`light/full` 的额外成本以可量化/可解释的 overhead 口径单独验收（对齐 NFR-002/NFR-005）。
- **Rationale**：保持核心性能门槛口径稳定，避免把“诊断开销”混入主指标导致验收噪声与优化方向误判。

## TanStack Form 调研：数组/校验心智与对 010 的启示

> 目标：对齐一个“业界极致表单库”的数组与校验心智，用于反向校验 010 的 FR 与 API 设计；重点放在 **动态列表 + 校验模型 + 错误组织方式**，而不是逐一对齐 API 细节。

### 1. 核心心智：Form Store + Field Render Props

- `useForm` 把整个表单视为一个 **强类型的状态存储（FormApi<TValues>）**：
  - `defaultValues` 决定 `TValues` 的结构，`form.Field name="..."` 的 `name` 是基于 `TValues` 推导出来的 **路径字符串字面量类型**；
  - TS 能在编译期拦截错误路径（例如 `name="firstName"` 但 `defaultValues` 里只有 `name`）。
- `form.Field` 是一等公民入口，采用 **Render Props**：
  - `name`：字段路径，例如 `"firstName"`、`"people[0].name"`；
  - `children(field)`：拿到 `field.state.value/meta` + `field.handleChange/handleBlur` 等方法，自行渲染 Input；
  - `field.state.meta` 聚合了 `isTouched/isValid/isValidating/errors/errorMap` 等衍生状态。
- `form.Subscribe` 负责派发“表单级派生状态”：
  - 典型用法：`selector={(state) => [state.canSubmit, state.isSubmitting]}`；
  - UI 通过订阅衍生状态决定按钮是否可点、是否展示 loading，而不直接读取内部实现细节。

对 010 的启示：

- **路径 → 类型 → DX**：TanStack Form 把“路径类型化”当成基础能力，这与 010 Phase B 的 `Form.FieldPath/Form.FieldValue` 目标高度一致。
- **Form Store 一等公民**：它默认所有行为都围绕 `FormApi` 展开，RHF 风格的“轻量 register”只是一层包装；这与我们以 Module/State 为“唯一事实源”的立场一致。

### 2. 校验模型：多阶段 validators + errorMap/meta

- Field 级校验通过 `validators` 配置：
  - 事件维度：`onMount/onChange/onChangeAsync/onBlur/onBlurAsync/onSubmit/onSubmitAsync/onDynamic/onDynamicAsync` 等；
  - 形态：`validators={{ onChange: ({ value }) => ..., onChangeAsync: async ({ value }) => ... }}`；
  - 返回值：可以是字符串、对象或 `undefined`，最终聚合到 `field.state.meta.errors` 数组与 `errorMap.*` 上。
- Form 级校验可以通过 `validationLogic` + `validators` 做集中管理：
  - 例如 `validationLogic: revalidateLogic()`，配合 `validators.onChange/onDynamic` 返回 `{ fieldName: error }`；
  - Form 级 validators 操作的是 **整棵 values 树**（`value` 即整个 form 的值）。
- 错误展示：
  - Field 侧常见用法是从 `field.state.meta.errors` 或 `field.state.meta.errorMap.*` 中取出对应阶段的错误；
  - Form 级错误通过 `form.state.errorMap.*` 暴露，可用于全局 banner 等场景。

对 010 的启示：

- **多阶段校验**：TanStack Form 把“校验在什么时候跑”严格拆成多个阶段（onChange/onBlur/onSubmit/...），与我们区分 `scopedValidate`（事务内）与 submit-resolver（事务边界外）的思路一脉相承。
- **错误 map 结构**：它为每个阶段维护 `errorMap`，证明“错误按来源/阶段细分”是有现实需求的，我们在 010/009 的诊断事件里也可以保留这种分档能力（但不必 1:1 对齐命名）。

### 3. 数组与动态列表：`mode="array"` + push/remove 语义

- TanStack Form 把数组视为普通字段的一个特例，通过 `form.Field` 提供 `mode="array"`：

  ```tsx
  const form = useForm({ defaultValues: { people: [] } })

  return (
    <form.Field name="people" mode="array">
      {(field) => (
        <div>
          {field.state.value.map((_, i) => (
            <form.Field key={i} name={`people[${i}].name`}>
              {(subField) => (
                <input
                  value={subField.state.value}
                  onChange={(e) => subField.handleChange(e.target.value)}
                />
              )}
            </form.Field>
          ))}
          <button type="button" onClick={() => field.pushValue({ name: '', age: 0 })}>
            Add person
          </button>
        </div>
      )}
    </form.Field>
  )
  ```

- 列表操作通过 Field API 暴露：
  - `field.pushValue/insertValue/removeValue/swapValues/...`；
  - UI 用 `.map` + `name=\`people[${i}].foo\`` 这种字符串路径来绑定每一行。
- 行标识：
  - 文档示例通常用数组 index 作为 `React key` 与路径一部分（`people[0].name`），**没有额外的 rowId 概念**；
  - 删除/插入中间元素时，下游行的路径与 `React key` 一起漂移。

对 010 的启示：

- **数组操作 API**：`Form.list` 的默认动作（append/prepend/remove/swap/move）可以直接对标 `pushValue/removeValue/swapValues` 等语义，用来指导 controller 与 React hooks 的 API 形状。
- **路径心智**：业务写法仍然倾向于 `userList.0.warehouseId` 这样的 valuePath，而不是 `$list/rows[0].warehouseId`；010 的 `$list/rows[]` 应该尽量隐藏在内部，通过 Path 工具完成映射。
- **rowId 的必要性**：TanStack Form 直接用 index 做标识，意味着删除/插入会让“某一行的错误/交互态”漂移到别的行；这恰好反证了 010 中 `$rowId` 锚点与不可漂移错误树的重要性。

### 4. 列表级/跨行校验的典型模式

文档没有提供专门的“list-scope validator” 原语，常见做法有两类：

1. **在数组 Field 上做校验**：
   - `name="people"` 且 `mode="array"`，validators 接收整个数组的 `value`；
   - 开发者在 validator 内部遍历 `value`，构造诸如“至少 N 行”“某字段必须唯一”等规则，再按需要把错误挂到 `people` 或子字段路径上。
2. **在 Form 级 validators 中做交叉校验**：
   - Form 级 `validators` 的 `value` 是整棵表单值树，开发者可以直接对 `value.people` 做扫描；
   - 错误以 `{ fieldName: message }` 的形式写入 `errorMap`，再由 UI 自行映射。

这些模式的共同特征：

- **跨行规则通常是“每次 onChange 全表扫描”**：没有统一的 list-scope IR 或增量触发协议，是否优化完全取决于业务代码是否手动剪枝。
- **错误组织不区分 `$list` 与 `rows[]`**：
  - 错误可以落在 `people` 或 `people[0].name` 等路径上，但没有一个统一的“列表级错误树（含 rows 元信息）”模型；
  - Devtools 只能看到最终错误 map，很难恢复“扫描了多少行、哪些行受影响”等诊断信息。

对 010 的启示（也是我们刻意要做得更好的地方）：

- 010 需要把“跨行规则”强制收敛为 list-scope check + `$list/rows[]` 错误树：
  - **依赖/触发** 用 `deps:["warehouseId"] -> userList[].warehouseId` 约束，而不是“每个 validator 自己随意读取 values”；
  - **行级归属** 用 `$rowId`（必要时 index 降级）表达，避免错误在增删/重排后漂移；
  - **诊断** 要能直接给出“扫描行数/受影响行数/实际改动行数”等统计，而不是只暴露最终错误字符串。

### 5. TanStack Form 值得借鉴与不采纳的部分（010 视角总结）

**值得直接借鉴的点**

- 路径与类型：
  - `name` 基于 `defaultValues` 推导的 Path 类型，是我们在 Phase B `Form.FieldPath/Form.FieldValue` 里希望达到的体验标杆；
  - 数组路径统一使用 `foo[0].bar` 这种心智，便于与业务期望对齐，再在内部映射到 pattern/list/errorsPath。
- API 风格：
  - `useForm` + `form.Field` + `form.Subscribe` 的分层非常清晰：Form 负责存储与衍生状态，Field 负责局部绑定，Subscribe 负责跨字段聚合；
  - 对 010 而言，`Form.make` + controller + React hooks 可以在结构上向这一套靠拢，而不必复制具体命名。

**刻意不直接采纳的点**

- **校验触发靠“事件阶段”而不是 IR/deps**：
  - TanStack Form 把“什么时候校验”编码在 validators 的事件键上（onChange/onBlur/…），但不会为“哪些字段变化会触发哪些规则”提供统一 IR；
  - 010 会坚持“deps 唯一事实源”的约束，所有 list-scope 触发都从 deps/IR 推导，不额外引入 `listValidateOnChange` 这类逻辑开关。
- **错误树没有统一 list-scope 形态**：
  - TanStack Form 的 errorMap 更接近期望“按事件/字段维度查看错误”，缺少我们在 010 里强调的 `$list/rows[]` + `$rowId` 结构；
  - 010 会以 `$list/rows[]` 作为唯一事实源，再通过 Form.Path 为业务 UI 提供 valuePath ↔ errorsPath 的映射。
- **数组行无稳定 identity**：
  - TanStack Form 用 index 做 key/path，删除/插入后自然漂移；这在静态表单里问题不大，但不利于长事务、诊断与回放；
  - 010 会强制引入 rowId，并在诊断事件中记录 rowId 与 index 的关系，保证跨事务的可解释性。

综上：TanStack Form 在 **路径类型化、数组操作 API、校验阶段划分** 方面给了我们一个很好的对标对象，但在 **list-scope IR、错误树形态与稳定标识** 上仍更偏向“工程实践”，没有统一语义层。010 将在保持类似 DX 的前提下，把这些“隐式约定”提升为显式契约，并落到 Runtime/IR 上，避免跨场景/跨团队时重新踩坑。

## React Hook Form（RHF）调研：两阶段触发 / FieldArray identity / unregister / criteriaMode

### 1) 触发策略：`mode` + `reValidateMode`（两阶段）

- RHF 将“首次提交前/首次提交后”的触发策略拆成两段：
  - `mode`：提交前的校验触发策略（默认 `onSubmit`）。
  - `reValidateMode`：提交后的重校验策略（默认 `onChange`）。
- 010 的 `validateOn/reValidateOn + submitCount` 与其对齐，但实现上要坚持：
  - **deps 是唯一依赖事实源**（而不是让“事件阶段”决定范围）。
  - UI 的“何时展示错误”应主要由 `submitCount + touched` 驱动（避免引入第二套 `errorMap` 真相源）。

### 2) 动态数组：FieldArray 既需要 index-path，也需要稳定 row identity

- RHF 的 FieldArray 仍使用 index 路径（`items.0.name`）作为字段定位心智，但同时为渲染提供稳定 id（字段数组项带 `id`，可用 `keyName` 避免与业务字段重名冲突）。
- 010 的取舍更激进：
  - 业务/React 心智仍用 index 的 valuePath（便于声明与类型推导）。
  - 错误与交互态的归属必须以 `rowId` 为锚点（`$list/rows[]` + `$rowId`），增删/重排不漂移。

### 3) `shouldUnregister` / `unregister`：卸载字段是否保留值与是否参与验证

- RHF 的 `shouldUnregister` 默认 `false`：字段卸载后值默认保留，且卸载字段默认不参与内置校验；设为 `true` 时更接近原生表单（卸载即移除值）。
- 010 的转化方式：
  - Logix 里“字段是否挂载”不应成为校验内核的隐式输入；更推荐把“字段不再适用”表达为 **事务内派生（computed/link）驱动的清理**（值与错误一并确定性清理），而不是依赖 React unmount 触发 unregister。
  - 需要“卸载即清理”的 DX 时，可以后置为 controller 层的显式 `unregister(paths, options)`（不进 010 核心交付面，避免扩大表面积）。

### 4) `criteriaMode`（firstError vs all）：单字段多错误的取舍

- RHF 提供 `criteriaMode: firstError | all`，控制“每个字段收集一个错误”还是“收集所有错误”。
- 010 的建议取舍：
  - **默认 firstError**：保持错误值 Slim、写回可压缩、可诊断且利于性能止损（与 NFR-002 目标一致）。
  - 如需 all-errors，优先作为后置能力（例如在诊断/Devtools 层以 evidence 形式展开），避免把多错误常态化塞进 `errors` 真相源。

## Ant Design / rc-field-form 调研：NamePath / preserve / dependencies / validateFirst

### 1) NamePath（段数组）绕开 string path 解析

- AntD/rc-field-form 的 `name` 支持 NamePath（段数组，含 index），天然避免“string path 解析/转义”的歧义。
- 010 仍选择 string valuePath（LLM 友好、易生成），但必须补齐：
  - 统一的 valuePath  percise parse + 归一化（FR-010c）。
  - 严格的 canonical FieldPath（段数组、无 index）作为 IR/诊断口径（FR-008）。

### 2) `preserve`：字段移除后默认保留值（与 RHF `shouldUnregister=false` 相似）

- AntD 的 `preserve` 默认 `true`：字段移除后仍保留值；若设为 `false` 则移除值（常用于条件渲染字段的“消失即清理”）。
- 010 的对齐策略同 RHF：默认 preserve（Module state 不因 UI mount/unmount 变化而丢失），清理应由显式事务写回表达。

### 3) `dependencies`：上游变化触发下游更新与校验

- AntD 的 `dependencies` 语义与 TanStack 的 `listenTo`、RHF 的 cross-field watch 类似，本质都是“依赖触发”。
- 010 坚持用 deps 统一表达，并把“触发范围/最小执行集”交给 runtime（ReverseClosure），避免 UI/业务侧手写触发链。

### 4) `validateFirst`：遇到首个错误即止损（firstError）

- AntD 支持 `validateFirst`（遇首错止损，或并行校验）。
- 010 选 firstError 作为默认，也能更容易满足性能预算（SC-002）与诊断 Slim（NFR-002）。

## React Final Form（RFF）调研：Subscriptions 作为高性能的核心抓手

- RFF 的核心卖点同样是“订阅裁剪”：Field/Form 通过 subscription 决定只在关心的状态切片变化时重渲染。
- 010 的 `useFormState(form, selector)` + 引用稳定 `FormView` 是对该思路的体系化吸收，且比“让业务自己扫大树算衍生”更可治理、可优化、可诊断。

## 对 010 的补充建议（基于竞品差异的落地点）

1. **把 firstError 作为默认并写进数据模型/quickstart**：与 RHF `criteriaMode=firstError`、AntD `validateFirst` 对齐，避免把 all-errors 直接塞进 errors 真相源。
2. **把 preserve/unregister 作为“后置/可选 DX”处理**：核心约束不把 React mount/unmount 变成内核语义；优先用 `derived + computed/link` 把“字段不再适用”降解为确定性清理。
3. **补齐 list-scope 输出对“嵌套字段”的表达**：rowErrors 的 key 允许使用“行内相对 valuePath”（如 `address.city`），由 Form.Path 统一解析并写回到 `$list/rows[]` 对应 leaf（避免业务在 rule 里返回任意全局 path-map）。
4. **文档显式澄清 FieldArray 的 `fields[i].id` 语义**：它是 runtime rowId 的元信息（用于 React key/诊断锚点），不是 values 行对象本身；避免复刻 RHF“id 字段被覆盖/混用”的坑。
