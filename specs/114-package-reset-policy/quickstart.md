# Quickstart: Package Reset Policy

## 1. 先盘点包清单

```bash
rg -n '"name"\\s*:' packages/*/package.json
find packages -maxdepth 2 -type d | sort
```

先看这几份当前台账：

- `inventory/package-inventory.md`
- `inventory/disposition-matrix.md`
- `inventory/reuse-candidates.md`
- `inventory/family-templates.md`
- `inventory/archive-operations.md`
- `inventory/audit-results.md`

## 2. 为每个包回答四个问题

1. 这个包属于哪个 family
2. 它的旧实现是保留、封存重建、并入 kernel 还是停止增长
3. 哪些热链路、协议、helper、fixtures、测试资产可以直接复用
4. 后续由哪个 spec 接手

## 3. 适用当前默认路由

- `115`：`@logixjs/core`、`@logixjs/core-ng`
- `116`：`@logixjs/react`、`@logixjs/sandbox`、`@logixjs/test`、`@logixjs/devtools-react`
- `117`：`@logixjs/query`、`@logixjs/form`、`@logixjs/i18n`、`@logixjs/domain`
- `118`：`@logixjs/cli`
- `119`：`examples/logix`
- out-of-cutover tooling：`speckit-kit`

## 4. 套用封存重建协议

若处置类型为 `freeze-and-rebootstrap`，使用以下口径：

- 旧实现迁移到 `packages/_frozen/<dir>-legacy-<YYYYMMDD>/`
- 新主线继续使用 `packages/<dir>/`
- 迁移说明回写到 owner spec 和相关 docs
- 已对齐目标契约的实现与测试资产优先平移到新主线

owner spec 进入实施前，至少先核对：

- `inventory/disposition-matrix.md`
- `inventory/reuse-candidates.md`
- `inventory/family-templates.md`
- `inventory/archive-operations.md`
- `data-model.md`

再确认一个最小 topology contract：

1. canonical 路径是什么
2. 公开子模块有哪些
3. internal cluster 有哪些
4. test mirror 放在哪里
5. 改动后需要回写哪些 docs / spec

## 5. 完成标准

- 当前关键包都有处置类型
- family template 已能支撑后续 owner spec
- `core-ng` 已被路由到 kernel 吸收线
