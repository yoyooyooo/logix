---
title: Hot Path Direction
status: living
version: 2
---

# Hot Path Direction

## 目标

冻结新体系下内部热链路的主方向。

## 当前方向

- runtime assembly / control plane 不列入 steady-state 热链路主清单
- `process / link` 的定义与监督壳层不列入热链路主清单
- 保留统一事务、统一提交、统一解析轴
- 为旧 surface 或旧兼容壳层存在的运行时分支默认删除
- 删除 dead branch
- 显式化 `sync rule / async task`
- 显式化 writeback batching policy 与稳定 batch meta
- 把运行时解释税继续前移到 build / install
- React 内部语义迁到 `Program instance`

## 说明

这份文档只冻结方向，不展开实现细节。

历史论证已经收口到当前 SSoT、ADR 与 standards，后续不再依赖 proposal 目录承载真相源。
