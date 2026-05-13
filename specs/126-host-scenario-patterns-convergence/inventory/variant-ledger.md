# Variant Ledger

| Variant | Primary Entry | Family | Notes |
| --- | --- | --- | --- |
| local instance | `useModule(ProgramRuntimeBlueprint)` | host projection | 组件局部实例 |
| session instance | `useModule(ProgramRuntimeBlueprint, { key, gcTime })` | host projection | 会话保活协议 |
| suspend variant | `useModule(ProgramRuntimeBlueprint, { suspend: true, key })` | host projection | 局部实例协议变体 |
| imports scope | `useImportedModule(...)` / `host.imports.get(...)` | host projection | imported 子实例解析 |
| root escape hatch | `Root.resolve(...)` | host projection | root provider 单例出口 |
| subtree process installation | `useProcesses(...)` | process expert family in host | UI 子树安装点，不进入 verification 主干 |
