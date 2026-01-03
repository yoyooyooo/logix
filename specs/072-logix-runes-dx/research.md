# Research: Logix Runes（Svelte-like 赋值驱动状态语法糖）

**Feature**: `072-logix-runes-dx`  
**Created**: 2026-01-03  
**Goal**: 把“局部状态 + 高频交互”的 DX 提升为接近 Svelte 5 `$state` 的体验，同时保持 Logix 的可追踪写入与可诊断链路。

## Decision 1：必须是编译期改写（transform-first）

**Decision**：采用编译期改写（Vite 插件）实现赋值触发更新；运行时不尝试代理/拦截局部变量赋值。

**Rationale**：

- JavaScript/TypeScript 运行时无法拦截 `count += 1` 这类对局部变量的赋值。
- 强行做运行时魔法（Proxy/with/defineProperty 等）要么不可行、要么会破坏可预测性与性能。

**Alternatives considered**：

- 运行时 Proxy：只能拦截对象属性，不覆盖局部变量赋值；且容易引入深层写入歧义。
- 仅提供 `useSelector/useDispatch` 的更薄 API：能提升一部分 DX，但无法满足“赋值触发更新”的目标。

## Decision 2：显式 opt-in，避免 Hook 误注入

**Decision**：transform 必须 opt-in（文件级指令/注释），并静态校验 `$state` 的使用位置。

**Rationale**：

- transform 一旦注入 hook（`useRunes`），若误作用于普通函数会触发 `Invalid hook call`，属于灾难性 DX 回退。
- opt-in 让错误更可控：要么明确启用，要么明确报错。

**Alternatives considered**：

- 自动检测 JSX/函数名启发式：误判概率高；一旦误判就是运行时崩溃。

## Decision 3：`+=/++/--` 必须是“基于最新提交值”的 op-based 更新

**Decision**：对 `+=/++/--` 改写为 op-based 更新（inc/dec），运行时在提交点读取最新值计算。

**Rationale**：

- React 事件/异步回调天然存在闭包旧值；把 `count += 1` 改写成 `set(count + 1)` 会丢更新。
- op-based 更新满足 `FR-003 / SC-004`，且语义可解释、易诊断。

**Alternatives considered**：

- function update：`update(key, f)` 需要把 `f` 作为闭包传入，难以序列化与诊断；除非强约束表达式模型（复杂度大）。

## Decision 4：MVP 明确拒绝深层写入与复杂表达式

**Decision**：首版只支持受限语法集合；深层写入、解构写入、自增嵌入表达式等一律构建期拒绝。

**Rationale**：

- 这些语法一旦“半支持”，最容易产生隐蔽 bug（写了但不更新/不断链/不可诊断）。
- Logix 的优势是可解释链路；语义不清晰的魔法会反向伤害产品能力。

## Open Questions（留给未来迭代）

1. Devtools 噪声：runes 写入是否需要单独事件类型/折叠策略，避免时间线被高频点击刷屏？
2. 批处理语义：是否需要 `batch(() => { ... })` 或同 tick 合并？如何保证语义可预测且可诊断？
3. evidence 退化：如果 schema 无法提供稳定 fieldPathId，是否接受 dirtyAll？还是要生成固定 Struct schema？
4. 非 Vite 构建链路：是否值得做 SWC/Babel 插件或 TS transformer 的可移植实现？

