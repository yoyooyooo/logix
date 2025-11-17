# Form DX vs RHF（差距与极致方案）

> 目标：让 `@logix/form` 成为“业务默认入口”，体验 **≥ RHF**，同时严格满足 Logix 的约束：  
> **上层可完全降解到下层（统一最小 IR）**、**deps 唯一事实源**、**事务窗口禁 IO**、**稳定标识**、**诊断 Slim 可序列化**、**拒绝向后兼容**。

## 0. 结论（一句话）

当前 `@logix/form` 的 DX 更像“把 Logix Module/Action/Reducer/Trait 打包成 Blueprint”，还没有达到 RHF 级“甜度”；要达成 **RHF≥**，关键不是新增一堆 API，而是把 **路径/类型/错误树/触发推导/提交语义** 收敛成唯一默认口径，并确保全链路可降解到 IR。

## 1. 现状快照（以代码为准）

### 1.1 已经做对的（Form 的“骨架”已经成立）

- **Blueprint + Controller**：`Form.make` 产出 `module/impl/logics/controller`（`packages/form/src/form.ts:1`）。
- **React 薄投影**：`useForm/useField/useFieldArray` 只做 selector 投影 + action 派发（`packages/form/src/react/useField.ts:1`、`packages/form/src/react/useFieldArray.ts:1`）。
- **交互态事实源**：dirty/touched 写入 `state.ui`（reducer 维护）（`packages/form/src/form.ts:120`）。
- **Schema 错误映射 helper**：`Form.SchemaErrorMapping` 能把 Schema error 映射成 `errors.<path>` 写入（`packages/form/src/schema-error-mapping.ts:1`）。

### 1.2 当前显著不足（会直接拖垮“RHF≥”目标）

1. **字段路径全是 string，value/error 全是 unknown**

- `useField(form, path: string)` 返回 `value/error: unknown`（`packages/form/src/react/useField.ts:12`）。
- 这在真实业务里会导致：大量 `as any`、大量路径拼写错误只能靠运行时报错、生成器/LLM 无法稳定对齐字段类型。

2. **errors 结构仍然假设“按 index 与 values 同构”**

- `useField` 读取 `errors.${path}`（`packages/form/src/react/useField.ts:23`）。
- reducer 的数组动作会同步 `errors.<path>` 与 `ui.<path>` 的数组长度（`packages/form/src/form.ts:95`）。  
  这与 010 目标错误树 `$list/rows[]`（含 rowId 锚点、增删/重排不漂移）存在直接冲突。

3. **存在“专家开关” `listValidateOnChange`**

- `Form.install` 里用 `listValidateOnChange` 把 item validate 提升为 list validate（`packages/form/src/logics/install.ts:7`）。  
  这会制造团队写法分裂与平台不可治理：同一需求出现多套“正确性补丁”。

4. **缺少 RHF 级关键操作语义（submit/reset/validate/unregister）**

- 当前 controller 没有 `reset/validate/handleSubmit` 等“业务默认动作”（`packages/form/src/form.ts:55`）。  
  RHF 的“甜”并不是 API 名字，而是这些操作具有可预期的默认语义与组合方式。

5. **FieldArray 只有最小操作，且缺少“行级语义协议”**

- 仅 append/prepend/remove/swap/move（`packages/form/src/react/useFieldArray.ts:28`）；缺少 insert/update/replace 等常用操作。
- `fields[].id` 的稳定性依赖 runtime 的 `__rowIdStore`，但 UI/错误树的稳定归属协议尚未“端到端固化”。

6. **RHF 的“规则库/Resolver 生态”在 Form 侧缺位**

- 目前只有 helper（SchemaErrorMapping），没有“默认 submit 校验 → 错误写回 → 返回结果”的统一链路。
- 010 的 list-scope 校验将引入更复杂的“多行写回/稳定归属/无 churn”，需要 Form 层提供默认协议与工具。

## 2. 对标 RHF：哪些是我们必须赢的，哪些不必复刻

### 2.1 必须赢（Logix 独有优势，RHF 做不到同等一致）

- **全双工可回放**：values/errors/ui 都在 module state；事件可串成 txn/trace；平台可重放/可解释。
- **异步资源一体化**：`StateTrait.source` 的并发/门控/回放语义与表单同源（不在组件里散落 useEffect）。
- **IR 统一治理**：校验/派生/资源/触发范围都可降解到 IR，支持冲突检测、合并与诊断。

### 2.2 不必复刻（RHF 的 API 形式不是目标）

- 不需要 1:1 的 `register` 兼容层；但我们需要达到它的“低样板 + 低踩坑率”。
- 不强求 uncontrolled input 的实现路径（会引入 DOM/local state 的第二事实源风险）；我们走“txn 批处理 + selector 最小订阅 + 无 churn 写回”。

## 3. 极致方案（建议按优先级落地）

下面每一项都以“可降解到 IR、可诊断、可性能验收”为硬门槛。

### 3.1 统一路径体系（DX 的地基）

**目标**：业务写 `useField(form, "items.0.warehouseId")` 时：

- value 类型可推导；
- deps/触发推导用 pattern 路径（`items[].warehouseId`）；
- 错误树映射透明（读写不再是 `errors.${path}` 的“硬拼接”）。

**提案**：

- 引入 `Form.Path`（纯工具，不引入运行时状态）：
  - `toSegments(path)`（识别 number 段）
  - `toPatternPath(valuePath)`：`items.0.a -> items[].a`
  - `toListPath(valuePath)`：解析出 `listPath/index/fieldRest`
  - `valuePathToErrorPath(valuePath)`：对外仍是 valuePath；对内映射到 `$list/rows[]`
- 把当前散落的路径逻辑收敛到 `Form.Path`：  
  `packages/form/src/internal/path.ts`、`packages/form/src/logics/install.ts`、`packages/form/src/react/useField.ts`、`packages/form/src/schema-error-mapping.ts`。

**验收**：

- 业务侧不再出现 `errors.${path}` 这种拼接（Form 内部做映射）。
- list/item deps 的语义统一：list-scope deps 自动视为 `items[].<field>`（010 裁决）。

### 3.2 类型化 FieldPath + FieldValue（甜度的核心）

**目标**：接近 RHF 的“字段名与值类型一致性”。

**提案（最小可落地）**：

- 在 `@logix/form` 提供类型工具：
  - `Form.FieldPath<TValues>`：支持数组索引占位（`${number}`）与普通对象路径；
  - `Form.FieldValue<TValues, P>`：给定 path 推导 value 类型（含数组）。
- 更新 React hooks 与 controller 的泛型签名（不改变运行时语义）：
  - `useField<TValues, P extends FieldPath<TValues>>(form, path: P)` → `value: FieldValue<TValues, P>`、`onChange(next: FieldValue<TValues, P>)`
  - `useFieldArray` 返回 `TItem` 级类型（至少为 `unknown` → `any` 的可控升级）

**验收**：

- `useField(form, "profile.email")` 推导为 string；`onChange` 只能传 string。
- `useField(form, "items.0.warehouseId")` 推导为 string。

### 3.3 errors 结构升级为 `$list/rows[]`（正确性 + 性能 + 可诊断）

**目标**：动态列表场景不漂移、不残留、不靠开关，且不负优化。

**提案**：

- 按 010 契约：
  - `errors.items.$list`
  - `errors.items.rows[i].$rowId`
  - `errors.items.rows[i].warehouseId`
- Form/React 侧保持 valuePath 心智不变：
  - `useField(form, "items.0.warehouseId")` 内部读 `errors.items.rows[0].warehouseId`；
  - `useFieldArray` 的 `fields[i].id` 与 `errors.items.rows[i].$rowId` 对齐（用于诊断解释与重排一致性）。

**验收**：

- 增删/重排后错误不会漂移；删除行后错误/交互态不会残留。
- list-scope 写回必须具备结构复用（不产生等价 churn），避免渲染负优化。

### 3.4 删除 `listValidateOnChange`，触发语义只认 deps/IR

**目标**：彻底杜绝“专家开关”。

**提案**：

- 010 要求修复 core 的 list-scope deps 归一化（`deps:["warehouseId"] -> items[].warehouseId`），并补齐结构依赖（insert/remove/reorder 也触发）。
- Form.install 只做：
  - UI 事件 → scopedValidate（field/item/list/root）
  - sources refresh（依赖推导）
  - 数组动作也触发 validate（至少 list target），确保一致刷新/清理

**验收**：

- 任何 list-scope 规则在 onChange 下无需开关即可正确刷新。

### 3.5 提交/校验/重置：给出 RHF 级默认语义，但不引入第二事实源

**目标**：业务能“少写逻辑”，同时保持回放与事务边界。

**提案**（更贴近 Logix 的形式）：

- Controller 增强：
  - `validate(paths?)`：触发 scoped validate（默认 root）
  - `reset(values?)`：重置 values + 清空 errors/ui（必须是事务写回，可回放）
  - `handleSubmit`：返回一个 effect/handler，内部执行 `submit -> validateRoot -> 判断 errors -> 决定是否进入后续 Task`
- 提供默认 LogicPreset（仍在 module.logic 中执行，不在组件内偷跑）：
  - “提交后若无错才发起 IO”必须通过 Task/事务外执行，保持“事务禁 IO”硬约束。

**验收**：

- 业务侧不需要手写“清空 errors → 写 errors → 再触发 validate”这一类流程（现状 case09 的写法应被收敛）。

### 3.6 Rules/Errors 的最终收口（API 小而强）

**目标**：业务规则组织“像 RHF 一样顺手”，但产物仍是 kernel `CheckRule`。

**提案**：

- `Form.Rule` 只保留极少入口：
  - `make({ deps?, validate })`
  - `merge(...)`（重复 ruleName 稳定失败）-（可选）`withMeta(...)` / `rename(...)` 等纯数据 helper（不引入运行时）
- Builtins（如 required/minLength/pattern）若要提供，应放到独立命名空间并严格遵守：
  - 输出仍是 `CheckRule`
  - meta 可序列化
  - 不隐藏 deps（deps 仍必须显式可见/可推导）

**验收**：

- 同一场景不会出现“有人用 Rule、有人手写 check 对象、有人扫全表”的三套写法。

### 3.7 Rule ↔ Schema 的复用边界（Phase D 收口）

**目标**：既复用 `effect/Schema` 的类型与结构校验能力，又不引入“第二套校验真相源”，并避免 onChange 负优化。

**提案**：

- Schema 的定位：默认作为 **root 级 resolver**（submit/manual/root validate），负责结构/类型边界与字段级约束；不承担 list-scope 的跨行语义（跨行仍必须用 010 list-scope Rule）。
- Rule 的定位：作为运行时一等原语（deps+scope+诊断），覆盖 onChange/onBlur 的高频增量校验与 list-scope 一次扫描多行写回。
- 合并策略：Schema + Rules 最终必须落到**同一份错误树**（010 的 `$list/rows[]`），且写回应由“单一 writer step”完成（避免多 step 竞写同一路径导致 churn/冲突）。
- 路径协议：Schema issue path 更接近 valuePath（可能含 index）；IR/诊断一律对齐 009 canonical FieldPath（段数组、无 index/`[]`），行级范围用 rowId/indices 单独表达。

**验收**：

- `handleSubmit/validate` 默认可同时跑 Schema + Rules，并输出一致错误树与可序列化诊断；onChange 默认不跑 Schema（除非显式开启且有性能证据）。

## 4. 分阶段落地建议（最少闭环）

**Phase A（跟 010 同步）**：错误树 `$list/rows[]` + 删除 `listValidateOnChange` + deps 归一化修复 + array 动作触发 validate。  
**Phase B**：Path 工具收敛 + 类型化 FieldPath/FieldValue（先覆盖 80% 常见路径）。  
**Phase C**：Controller 补齐 `reset/validate/handleSubmit` + 默认 submit logic preset。  
**Phase D**：Rules/Schema 生态收敛：SchemaErrorMapping 融入 submit 校验链路，案例与文档统一。

---

## 关联材料

- Blueprint/Controller 目标形态：`specs/004-trait-bridge-form/references/06-form-business-api.md`
- 010 Form API 契约：`specs/010-form-api-perf-boundaries/spec.md`、`specs/010-form-api-perf-boundaries/contracts/*`
- 010 落地拆解/计划：`specs/010-form-api-perf-boundaries/tasks.md`、`specs/010-form-api-perf-boundaries/plan.md`
- 010 裁决与用法：`specs/010-form-api-perf-boundaries/research.md`、`specs/010-form-api-perf-boundaries/quickstart.md`
- 反例（业务仍直接写 StateTrait / 依赖开关）：`examples/logix-react/src/demos/form/cases/case11-dynamic-list-cascading-exclusion.tsx`
