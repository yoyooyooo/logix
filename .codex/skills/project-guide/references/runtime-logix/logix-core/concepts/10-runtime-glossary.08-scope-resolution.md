# 8. 作用域与层级解析（Root Provider / imports-scope / Nearest Wins）

- **Runtime Tree（运行时树）**
  - 指一次 Runtime 构造出的“可运行边界”：拥有自己的 root provider、模块实例树与 Scope 生命周期；
  - 同一进程中可以存在多棵 Runtime Tree，彼此隔离；不得通过隐式兜底跨树解析依赖。

- **Root Provider（根提供者）**
  - 指某棵 Runtime Tree 的根作用域（root scope）所提供的依赖集合；
  - 用途：表达“全局单例（对该 Runtime Tree 而言）”的提供与解析语义；
  - 关键边界：Root Provider 不是“进程级绝对全局”，而是“当前 Runtime Tree 的根”。

- **imports-scope（模块实例作用域）**
  - 指某个模块实例（host）对其“直接 imports 子模块实例”的可见性边界；
  - 用途：让“父模块/父组件访问子模块实例”变成可验证的约束：缺失 imports 就失败，而不是回退到更远作用域“碰巧拿到一个实例”。

- **Nearest Wins（最近胜出）**
  - 指依赖解析时的裁决规则：当同一 token 在多个层级存在时，解析结果必须来自“起点最近的那一层”，且行为稳定可预测；
