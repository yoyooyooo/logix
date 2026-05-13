# Research: React Runtime Scope Unification

## Decision 1: `RuntimeProvider` 回到 runtime scope provider

- **Decision**: `RuntimeProvider` 的公开定位固定为 runtime scope provider 与 host projection adapter
- **Rationale**: 用户需要把它理解为 React 子树的 runtime scope 边界，不能把它误认成第二装配层
- **Alternatives considered**:
  - 继续把 `RuntimeProvider` 描述成 runtime 装配器
    - rejected，因为这会与 `Program.make(...)` 和 `Runtime.make(...)` 的边界打架

## Decision 2: `Program` 是蓝图，`ModuleRuntime` 是实例

- **Decision**: `Program` 只承接装配蓝图语义，真实运行中的实例对象固定为 `ModuleRuntime`
- **Rationale**: 这样才能同时解释 “同一个 `Module` 生成多个不同 `Program`” 与 “同一个 `Program` 生成多个实例”
- **Alternatives considered**:
  - 把 `Program` 直接当成实例对象
    - rejected，因为这会让蓝图和实例混在一起，缓存与诊断都难以稳定

## Decision 3: `ModuleTag` 只解析 scope-local 唯一绑定

- **Decision**: `ModuleTag` 在当前 scope 下只能表示一个唯一绑定，不承担多 Program 选择语义
- **Rationale**: 一个符号在一个公式里必须单值，Agent 才能稳定推导
- **Alternatives considered**:
  - 让 `ModuleTag` 在多个同模块 `Program` 之间做隐式选择
    - rejected，因为这会直接破坏心智稳定性

## Decision 4: 同 scope 重复 `ModuleTag` 绑定必须 fail-fast

- **Decision**: 若一个 parent scope 会导入两个来自同一 `Module` 的 child `Program`，系统直接报错
- **Rationale**: 这类歧义越早暴露越容易修；拖到运行期隐式选择只会制造更难解释的问题
- **Alternatives considered**:
  - 后写覆盖前写
    - rejected，因为会制造不可预测的行为
  - 保持静默并让 `imports.get(tag)` 随便取一个
    - rejected，因为错误不可解释

## Decision 5: React 本地实例缓存必须区分同模块的不同 `Program`

- **Decision**: `useModule(Program, { key })` 的本地实例缓存键必须纳入 `Program` blueprint identity
- **Rationale**: 同一个 `Module` 的不同 `Program` 若共享 `moduleId + key`，会把不同蓝图的实例错误复用到一起
- **Alternatives considered**:
  - 继续只用 `moduleId + key`
    - rejected，因为同模块多 Program 时会串实例

## Decision 6: canonical 教学只保留 lookup 与 instantiate 两条主路

- **Decision**: canonical 文档、README 与示例只教授 `useModule(ModuleTag)` 与 `useModule(Program)`
- **Rationale**: 公开心智需要更小公式，减少 Agent 入口分叉
- **Alternatives considered**:
  - 继续推荐 `useModule(Module)` 作为主写法
    - rejected，因为它会把定义期对象重新拖回运行期入口

## Decision 7: `useImportedModule` 不拥有独立语义

- **Decision**: `useImportedModule(parent, tag)` 只是 `parent.imports.get(tag)` 的 hook 形态
- **Rationale**: 同一件事不该长出第二条语义路径；保留 helper 可以提升书写 ergonomics，但不能让它拥有新规则
- **Alternatives considered**:
  - 让 `useImportedModule` 继续作为独立 hook family 演进
    - rejected，因为它会持续制造 “它和 imports.get 到底差在哪” 的心智噪音
