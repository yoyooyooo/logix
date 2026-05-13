# Contracts: Package Reset Policy

本特性没有外部 API 合同，只有 package policy 合同。

## 1. Disposition Enum Contract

允许的处置类型只有 4 个：

- `preserve`
- `freeze-and-rebootstrap`
- `merge-into-kernel`
- `drop`

不得新增局部私货状态。

## 2. Archive / Rebootstrap Contract

- 若处置类型是 `freeze-and-rebootstrap`，旧实现默认迁移到 `packages/_frozen/<dir>-legacy-<YYYYMMDD>/`
- canonical 目录 `packages/<dir>/` 保留给新主线
- 封存目录必须带迁移说明落点
- 具体步骤与样例统一维护在 `inventory/archive-operations.md`

## 3. Reuse Contract

- 目录级 `freeze-and-rebootstrap` 不等于实现级全量推倒
- 已对齐目标契约的热链路、协议、helper、fixtures、测试资产应优先平移
- 只有边界、默认行为或控制面口径已失配的部分才进入激进重写
- 所有 reuse candidates 必须显式登记，不能只靠口头记忆

## 4. Public Surface Contract

- `src/index.ts` 为包级 barrel
- 公开子模块优先保持在 `src/*.ts`
- 共享实现与深层实现进入 `src/internal/**`
- 禁止让 `package.json#exports` 暴露 internal 路径

## 5. Test Mirror Contract

- 测试目录必须能映射公开面与 internal cluster
- 需要 fixtures 或 browser 测试的包，应在包内显式设目录

## 6. Family Template Contract

- `core` 家族围绕 kernel / runtime shell / observability / reflection
- `host` 家族围绕 provider / hooks / store / verification surface
- `domain` 家族围绕 program-first 或 service-first 主输出
- `cli` 家族围绕 control plane 命令面
- `tooling` 家族默认 preserve，除非明确阻塞主线
- 统一模板以 `inventory/family-templates.md` 为准

## 7. Topology Contract

- owner spec 进入实施前，必须能把目标包落成最小 topology contract
- topology contract 至少回答 canonical 路径、公开子模块、internal cluster、test mirror、docs writeback
- 字段口径以 `data-model.md` 为准
