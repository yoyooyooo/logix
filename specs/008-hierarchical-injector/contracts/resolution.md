# Contract: Resolution（strict 默认 + 显式 root/global）

**Branch**: `008-hierarchical-injector`

## 1. 定义

- **strict**：必须从“当前实例 scope（imports-scope）”解析；缺失提供者必须失败，不得回退到 root。
- **global/root**：显式从 root provider 解析；不受更近 scope 覆盖影响（用于单例语义）。
- **Nearest Wins**：当同一 token 在多个层级存在时，严格按“起点最近”选择；不得静默跳层。

### 1.1 Root 的定义（非进程级）

- **Root = 当前 Runtime Tree 的根**：由 `Runtime.make(...)` / `RuntimeProvider.runtime` 创建/选择；同一进程中可以存在多棵 Tree，彼此隔离。
- `Root.resolve(Tag)` 固定读取该 Tree 的 rootContext，不受更深层的 `RuntimeProvider.layer` 等局部 override 影响。

### 1.2 如何 Mock Root Provider（测试形态）

- 需要 mock root provider 时，应在**创建这棵 Runtime Tree 时**注入 Layer（例如 `Runtime.make(...,{ layer })` / `ManagedRuntime.make(Layer.mergeAll(...))`），并将该 runtime 作为最外层 `RuntimeProvider.runtime`。
- 不要依赖嵌套 `RuntimeProvider.layer` 来 mock `Root.resolve`：它只用于局部 override（影响 `useRuntime/useModule(ModuleTag)` 等“当前运行环境”入口）。

## 2. 入口一致性（必须同构）

下列入口在 strict/global 上必须同构（只允许差异在“包装层/返回句柄”）：

- Logic：`yield* $.use(ModuleTag)`（strict）
- Logic：跨模块协作使用 `Link.make`（显式跨模块/IR 承载）
- Logic：显式 root/global 使用 `Root.resolve(Tag)`（单例语义；支持 ServiceTag/ModuleTag）
- React：`useImportedModule(host, ModuleTag)`（strict）
- React：`host.imports.get(ModuleTag)`（strict）
- React：`useModule(ModuleTag)`（当前运行环境；受 `RuntimeProvider.layer` 影响：最近 wins）
- React：显式 root/global 使用 `runtime.runSync(Root.resolve(Tag))`（固定 root provider；忽略 override）

语义对比（避免“等价双轨”）：

| 入口 | 目的 | 解析起点 | 备注 |
|------|------|----------|------|
| `$.use(ModuleTag)` | 父模块访问 imports 子模块 | 当前模块实例 scope（strict 默认） | 不用于跨模块/实例选择 |
| `host.imports.get(ModuleTag)` / `useImportedModule` | UI 访问子模块 | host 实例 scope（strict 默认） | strict-only；缺失报错 |
| `useModule(ModuleTag)` | UI 读取当前运行环境单例 | 当前 React 运行环境 | 受 `RuntimeProvider.layer` 影响（最近 wins） |
| `Root.resolve(Tag)` | root 单例（忽略 override） | root scope | React 侧通过 `runtime.run*` 执行 |
| `Link.make` | 显式跨模块胶水逻辑 | 被 fork 时所在 scope | process 形式；显式列出 modules |

## 3. 行为约束（可测试）

### 3.1 strict：缺失提供者必须失败

Given：

- 父实例 scope 未提供 `ChildModule`（没有 imports/没有在该 scope 内 build 过）

When：

- 在 strict 入口解析 `ChildModule`（从 parent runtime 的 imports-scope injector / `ImportsScope` 解析）

Then：

- 必须失败（throw/die），且错误满足 `errors.md` 的字段与修复建议要求。

### 3.2 strict：同一进程多 root 必须隔离

Given：

- 两棵 root runtime（A/B）各自提供了 `T`（同一 ModuleTag 或 ServiceTag）

When：

- 在 root A 的入口解析 `T`

Then：

- 结果必须来自 A；不得返回 B（禁止任何跨 root 的全局兜底）。

### 3.3 global：显式选择 root 时不受 override 影响

Given：

- root scope 提供了 `T_root`
- 某个更近的实例 scope 也提供了 `T_child`
- React 侧存在 `RuntimeProvider.layer` 注入的 Service override

When：

- 调用方显式选择 global/root 语义解析 `T`

Then：

- 必须得到 `T_root`（对 `ModuleTag` 来说应等价于 `Root.resolve(ModuleTag)`），且结果不受 React override 影响。

### 3.4 `Root.resolve(ModuleTag)`：只表达 root 单例

Given：

- root scope 提供了 `ModuleTag` 的单例 runtime `M_root`
- 同一 `ModuleTag` 还存在一个或多个局部实例（例如 keyA/keyB，对应不同 host/imports-scope）

When：

- 调用方使用 global/root 语义解析 `ModuleTag`（例如 `Root.resolve(ModuleTag)`）

Then：

- 必须得到 `M_root`（root 单例）；不得返回任何局部实例。
- 若调用方需要某个局部实例，则必须改用 strict 入口并携带明确的实例句柄（`ModuleRuntime` / `ModuleRef`），或在边界先 resolve 后透传。

### 3.5 imports-scope injector 的边界（内存与可回收）

Given：

- `ModuleRuntime` 需要携带“imports-scope 的 injector”（例如 `ImportsScope`）以支持 strict 的 `imports.get` / `useImportedModule`。

Then：

- 该 injector MUST 只包含“模块 runtime 映射”等最小信息，禁止持有完整 `Context`（避免 root/base services 被意外引用）。
- 在 `Scope.close` / runtime dispose 后，必须释放该引用，以支持 React 卸载/HMR 场景的回收。
