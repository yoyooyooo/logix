# Logix Form PoC Package

> historical / quarantine
>
> 仅用于旧阶段 `docs/ssot/runtime/logix-form` 相关规范的 PoC；当前不作为 active teaching route，不作为正式运行时代码。
> 当前 canonical route 统一回 [../../docs/internal/form-api-tutorial.md](../../docs/internal/form-api-tutorial.md) 与 `examples/logix-react/src/demos/form/**`。

目标：

- 模拟一个真实的 B2B 管理后台项目；
- 用 TypeScript 类型和 demo 结构验证 Form 规划在 logix 体系中的落点；
  – 只写类型和签名（`declare` / `namespace` / `interface` 等），不写具体实现逻辑。

可以通过：

```bash
pnpm --filter @logixjs/form-poc typecheck
```

来验证类型是否自洽。
