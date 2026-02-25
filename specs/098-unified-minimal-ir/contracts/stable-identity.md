# Contract: Stable Identity（O-005）

## 锚点要求

- 必须保留并可序列化:
  - `moduleId`
  - `instanceId`
  - `txnSeq`
- 可用时补充:
  - `opSeq`
  - `linkId`

## 本次约束

- O-005 不引入随机锚点生成策略。
- `FullCutoverGate` 的装配期锚点继续使用 `txnSeq=0` 语义，不伪造运行期事务号。
- 新增解释字段（`reason/evidence`）不得破坏锚点稳定性，也不得依赖随机值。

## 诊断要求

- 失败/降级事件最少要能回溯到:
  - 哪个 `moduleId`
  - 哪个 `instanceId`
  - 因为哪些 service 缺失或 fallback 触发
