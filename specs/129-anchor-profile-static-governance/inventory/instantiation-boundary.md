# Instantiation Boundary

| Boundary | Current Narrative |
| --- | --- |
| 公开装配入口 | 继续只认 `Program.make(Module, config)` |
| 公开运行入口 | 继续只认 `Runtime.make(Program)` |
| `ModuleDef` | 不回公开主链，只在必要的定义锚点上下文出现 |
| `Workflow` | 不回公开主链，只留局部原型 / 历史上下文 |
