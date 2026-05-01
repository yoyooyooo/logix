# Research: Runtime Control Plane Verification Convergence

## Decision 1: `04` 与 `09` 由同一 second-wave spec 承接

- `04` 负责 control plane 定位
- `09` 负责 verification 主干与报告协议
- 二者分不开

## Decision 2: package ownership 必须明确

- `core` 定义 contract
- `cli` 暴露命令入口
- `test` 暴露 test harness
- `sandbox` 暴露 browser trial surface

## Decision 3: CLI 机器报告先对齐到 docs contract

- 顶层 `verdict` 固定为 `PASS / FAIL / INCONCLUSIVE`
- `mode / errorCode / environment` 必须作为第一版核心字段返回
- `trialrun`、`ir.validate`、`ir.diff` 继续只保留 expert / archive 身份
