# Steady-State Exclusions

| Exclusion | Code Roots / Surface | Why Excluded | Reopen Condition |
| --- | --- | --- | --- |
| runtime assembly | `packages/logix-core/src/Runtime.ts`、`packages/logix-core/src/internal/runtime/AppRuntime.ts`、`ModuleFactory.ts` | 装配成本不等于 steady-state 热链路 | 只有 current-head probe 指向 steady-state 默认路径时才重开 |
| runtime control plane | `Observability.ts`、`Reflection.ts`、`internal/observability/**`、`internal/debug/**` | trial / diff / report / diagnostics 不进入默认 steady-state | 只有 diagnostics=off 仍出现显著成本时才重开 |
| `process` | `packages/logix-core/src/internal/runtime/core/process/**`、`Process.ts` | process / supervision / trigger 壳层不在默认 steady-state 主清单 | 只有默认用户路径被 process 直接命中时才重开 |
| `link` | `Link.ts`、`DeclarativeLinkIR.ts`、`DeclarativeLinkRuntime.ts` | cross-module glue 与 steady-state 主线分开裁决 | 只有 current-head comparable 证据表明它进了默认热链路才重开 |
| runner | `core/runner/**`、`ProgramRunner*.ts` | root runner 只影响 boot / scoped run，不是 steady-state 常驻路径 | 只有产品级 SLA 明确命中 runner 路径才重开 |
