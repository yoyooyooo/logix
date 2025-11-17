# Contract: ReadQuery / SelectorSpec（协议化读状态）

## Required

- ReadQuery MUST 可降解为可序列化 Static IR：至少包含 `selectorId + lane + producer + readsDigest/reads + equalsKind`。
- `readsDigest` MUST 可复现且与诊断档位解耦：建议由“规范化后的 reads（顺序稳定）+ equalsKind（可选）”在 **事务外/装配期** 一次性计算并缓存；禁止在事务窗口内通过 join/split 往返或临时数组构造生成 digest。
- 运行期的 `select/equals` 等函数 MUST 不进入证据工件（evidence/export）与 DevtoolsHub 存储。
- `selectorId` 在 static lane MUST 稳定可复现（禁止随机/时间默认）；无法稳定时必须降级 dynamic 并给出 `fallbackReason`。
- `reads` 初期允许 canonical fieldPath string；但事务窗口内 MUST 避免 join/split 往返（逐步升级到 pathId/registry）。
