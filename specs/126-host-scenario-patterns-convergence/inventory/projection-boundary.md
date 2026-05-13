# Projection Boundary

| Entry | Role | Notes |
| --- | --- | --- |
| `@logixjs/react/RuntimeProvider` | projection | host runtime tree、fallback、layer override |
| `RuntimeProvider.layer` | projection | 子树 env override，不定义 verification plane |
| `useModule(ModuleTag)` | projection | 全局单例模块读取 |
| `useModule(ProgramRuntimeBlueprint)` | projection | 局部 / session / suspend 实例协议 |
| `useImportedModule(...)` | projection | imports scope 解析 |
| `Root.resolve(...)` | projection | root escape hatch |
| `examples/logix-react/**` | example | primary scenario examples |
| `examples/logix/src/verification/**` | verification | verification subtree only |
| `@logixjs/sandbox` | verification | browser trial surface，不并回 projection |
