# Runtime Descriptor Ledger: Declare Run Phase Contract

## Public To Internal Mapping

| Public Meaning | Internal Carrier | Notes |
| --- | --- | --- |
| declaration semantics | `LogicPlan.setup` | 仅作为 runtime normalized descriptor 保存 |
| run effect | `LogicPlan.run` | 继续作为运行期 fiber 入口 |
| no second phase object | `Module.logic(...)` builder | 对外只保留一个 builder surface |

## Runtime Sequence

1. 执行 builder，同步收集 declaration
2. 归一化为 internal descriptor
3. 安装 declaration side effects
4. 完成 init gate
5. 启动 run fibers
6. 处理 platform lifecycle signals

## Drift Guard

- docs、examples、tests 统一讲 declaration 或 run
- runtime internals 可以继续使用 `setup` 字段承载 normalized descriptor
- internal naming 不得反向泄露到 canonical docs/examples
