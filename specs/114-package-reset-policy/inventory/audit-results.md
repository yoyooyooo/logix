# Inventory: Audit Results

## Commands

```bash
rg -n '"name"\s*:' packages/*/package.json
find packages -maxdepth 2 -type d | sort
find packages/logix-core/src packages/logix-react/src packages/logix-query/src packages/logix-form/src packages/i18n/src packages/domain/src packages/logix-cli/src packages/logix-sandbox/src packages/logix-test/src packages/logix-devtools-react/src -maxdepth 3 \( -type f -o -type d \) | sort
rg -n 'service-first|program-first|runtime\.check|runtime\.trial|runtime\.compare|Module|Logic|Program|Runtime' docs/ssot/runtime/*.md docs/standards/*.md
```

## Findings

### Package Count

- `packages/` 当前共有 12 个 package 目录
- 本轮 cutover 的关键包为 11 个 logix 相关包
- `packages/speckit-kit` 保持 out-of-cutover
- `examples/logix` 继续作为邻接层，由 `119` 单独收口

### Family Split

- core family: `logix-core`, `logix-core-ng`
- host family: `logix-react`, `logix-sandbox`, `logix-test`, `logix-devtools-react`
- domain family: `logix-query`, `logix-form`, `i18n`, `domain`
- cli family: `logix-cli`
- tooling family: `speckit-kit`

### Reuse Density

- 测试与 helper 复用密度最高的是 `logix-core`, `logix-react`, `logix-form`, `logix-query`
- 协议与 artifact 复用价值最明显的是 `logix-sandbox`, `logix-test`, `logix-cli`
- 结构最薄、最适合直接重启的是 `domain`, `i18n`, `core-ng`

### Policy Consequence

- 只有 `@logixjs/core` 适合保留 canonical 主线并内部下沉 kernel
- `@logixjs/core-ng` 应直接进入 `merge-into-kernel`
- 其余主线 runtime、host、domain、cli 包默认走 `freeze-and-rebootstrap`

### Topology Audit Summary

- `@logixjs/core` 的公开层和 internal cluster 已经最接近目标 topology contract
- `@logixjs/react`、`@logixjs/sandbox`、`@logixjs/test`、`@logixjs/devtools-react` 已经形成可复用的 host family 目录簇
- `@logixjs/form` 当前同时带有 domain 内核和 `src/react/**`，证实它需要单独声明 host 邻接关系
- `@logixjs/cli` 当前 internal commands 仍含 `anchor*`、`ir*` 历史命令，证实 CLI 必须走主线重启

### Docs Alignment Audit Summary

- runtime docs 已固定 `service-first`、`program-first`、`runtime.check`、`runtime.trial`、`runtime.compare` 等核心词
- `docs/ssot/runtime/08-domain-packages.md` 已为 query、i18n、domain 给出主输出形态约束
- `docs/standards/logix-api-next-guardrails.md` 已把 verification control plane 与 package family 方向绑定到统一口径
- 这意味着 `114` 的 matrix、template、archive protocol 可以直接引用当前 docs 事实源，无需另建策略解释页
