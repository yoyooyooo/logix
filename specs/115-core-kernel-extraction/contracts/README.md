# Contracts: Core Kernel Extraction

本特性没有外部 HTTP 合同，只有 core 内部分层与公开面合同。

## 1. Kernel Boundary Contract

- kernel 只承接最小执行核、事务、调度、状态推进与运行时服务
- runtime shell 承接装配、控制面和公开入口
- observability、reflection、process 继续保持独立功能簇

## 2. Support Matrix Contract

- `@logixjs/core` 是长期主线
- `@logixjs/core-ng` 只作为支持矩阵输入与迁移材料
- consumer 不允许新增对 `@logixjs/core-ng` 的直接主线依赖
- 具体矩阵以 `inventory/support-matrix.md` 为准

## 3. Public Surface Contract

- 稳定主链继续围绕 `Module`、`Logic`、`Program`、`Runtime`
- `Kernel.ts` 暴露最小内核入口
- expert 家族保持 expert 身份，不回 canonical 主链

## 4. Reuse Contract

- 已对齐目标边界的热链路、诊断链路与覆盖测试优先复用
- 只有边界失配或控制面失配的部分才进入激进改造
- 复用台账以 `inventory/reuse-ledger.md` 为准

## 5. Perf Contract

- 后续实际 kernel 化改动必须先按 `perf/README.md` 建 before / after / diff
- `comparable=false` 时禁止对收益下结论
