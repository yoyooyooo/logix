# Round-trip Testing Strategy (全双工闭环测试)

> **Status**: Draft
> **Purpose**: 确保 Intent 与 Code 之间的转换是无损、稳定且鲁棒的。这是全双工引擎的生命线。

## 1. 核心理念：Property-Based Testing

由于 Intent 的组合空间是无限的，我们不能仅依赖手写的用例。我们将采用 **Property-Based Testing (PBT)** 方法，随机生成合法的 Intent 结构，验证其在转换链路中的不变性 (Invariants)。

## 2. 测试链路 (Test Pipelines)

### 2.1 The Identity Pipeline (Intent 一致性)

验证生成器和解析器的互逆性。

```mermaid
graph LR
    I1[Intent A] -->|Generate| C[Code]
    C -->|Parse| I2[Intent B]
    I1 == I2? --> Result{Pass/Fail}
```

- **Invariant**: `DeepEqual(Intent A, Intent B)`
- **Coverage**: 覆盖所有节点类型 (ServiceCall, Branch, Loop, Parallel) 及其嵌套组合。

### 2.2 The Stability Pipeline (Code 稳定性)

验证解析器和生成器不会引入无意义的代码变动（如格式抖动）。

```mermaid
graph LR
    C1[Code A] -->|Parse| I[Intent]
    I -->|Generate| C2[Code B]
    C1 == C2? --> Result{Pass/Fail}
```

- **Invariant**: `AST_Equal(Code A, Code B)` (忽略空白、注释差异)

### 2.3 The Resilience Pipeline (抗干扰能力)

验证 Parser 在面对人工修改时的鲁棒性。

1.  **Mutation**: 对生成的代码进行随机变异（修改参数、插入语句、重命名变量）。
2.  **Parse**: 解析变异后的代码。
3.  **Assertion**:
    - **Soft Mutation** (改参数): 节点应标记为 `Dirty` 但保持结构。
    - **Hard Mutation** (改结构): 节点应标记为 `Ejected` (Gray Box)。
    - **Global**: 图结构不应崩塌，未修改的节点应保持原样。

## 3. 实现工具

- **Generator**: `@effect/schema/Arbitrary` 用于生成随机 Intent。
- **Mutator**: `ts-morph` 用于对代码进行结构化变异。
- **Runner**: `fast-check` 用于驱动 PBT 流程。

## 4. CI 集成

Round-trip 测试属于计算密集型任务。建议在 CI 中配置为 **Nightly Build** 或在核心引擎变更时触发，运行数万次迭代以探索边界情况。
