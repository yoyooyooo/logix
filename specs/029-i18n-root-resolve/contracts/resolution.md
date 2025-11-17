# Contract: Resolution（strict 默认 + 显式 root/global + `$.root.resolve`）

**Branch**: `029-i18n-root-resolve`

## 1. 定义

- **strict**：必须从“当前实例 scope（imports-scope / 当前 Env）”解析；缺失提供者必须失败，不得隐式回退 root/global。
- **root/global**：显式从 root provider 解析；不受更近 scope 覆盖影响（用于单例语义）。
- **Root = 当前 Runtime Tree 的根**：同一进程可存在多棵 Tree，彼此隔离；root/global 解析不得跨 Tree。

## 2. 新增入口：`$.root.resolve(Tag)`

### 2.1 语义（必须同构）

`$.root.resolve(Tag)` 的语义必须与 `Logix.Root.resolve(Tag)` 等价：

- 固定读取当前 Runtime Tree 的 root provider；
- 忽略局部 override（例如 Logic 内 `Effect.provideService`、React 的 `RuntimeProvider.layer`）；
- 支持 ServiceTag 与 ModuleTag（ModuleTag 仅表达 root 单例，不用于多实例选择）。

### 2.2 约束（run-only）

`$.root.resolve(Tag)` 只允许在 Logic 的 run 阶段使用；在 setup 阶段使用必须稳定失败（同 `$.use` 的约束口径）。

## 3. 行为约束（可测试）

### 3.1 root/global：忽略局部 override

Given：

- root provider 提供 `T_root`
- 某个更近 scope 也提供 `T_child`

When：

- 调用 `$.root.resolve(T)` 或 `Root.resolve(T)`

Then：

- 必须得到 `T_root`，且不受 `T_child` 影响。

### 3.2 root/global：多 Tree 必须隔离

Given：

- 同一进程存在两棵 runtime tree（A/B），各自 root provider 都提供 `T`

When：

- 在 tree A 的逻辑中调用 `$.root.resolve(T)`

Then：

- 结果必须来自 A；不得返回 B（跨 Tree 污染率 0%）。

### 3.3 strict：缺失提供者必须失败（不因 root 存在而改变）

Given：

- root provider 提供 `T_root`
- 当前实例 scope 未提供 `T`

When：

- 调用 strict 入口解析（例如 `$.use(...)` / `Effect.service(...)`）

Then：

- 必须失败（缺失提供者），不得静默使用 `T_root`。
