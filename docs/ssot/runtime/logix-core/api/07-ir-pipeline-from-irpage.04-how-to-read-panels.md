# 4. IrPage 的每个面板应该怎么看（字段对照）

入口：`examples/logix-sandbox-mvp/src/ir/IrPage.tsx`

- `Manifest`：重点看 `moduleId/digest/actionKeys/schemaKeys/logicUnits`，并用 `manifest.staticIr.digest` 跳转到 StaticIR 面板。
- `StaticIR`：把 `nodes[].reads/writes` 当作读写集合；把 `edges` 当作依赖边；若有 `writesUnknown`，说明字段路径不 canonical。
- `TrialRun`：先看 `ok/error.code/error.hint`，再看 `environment.missingServices/missingConfigKeys`。
- `ControlPlane`：`runtimeServicesEvidence` 用来解释“最终选了哪个 impl、覆写来自哪一层”。
- `Timeline`：事件 `type` 当前主要是 `debug:event`；payload 的语义对齐 `RuntimeDebugEventRef`（见 3.8）。
