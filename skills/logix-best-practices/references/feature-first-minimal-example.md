---
title: Feature-first 最小样板（业务优先）
---

# Feature-first 最小样板（业务优先）

## 0) 适用场景

- 你要快速起一个可运行的 Logix 业务 feature。
- 你要拿到“可复制、可解释、可升级”的项目骨架。

## 1) 一键落地

1. 复制样板：`assets/feature-first-customer-search/src` → 目标项目 `src/`。
2. 或执行脚手架：

```bash
node <skill-root>/scripts/scaffold-feature-first.mjs --out ./src
```

3. 在 `src/runtime/layer.ts` 替换 mock service 为真实实现。
4. 运行 `src/scenarios/feature-first-customer-search.ts` 验证最小闭环。

## 2) 目录结构（保持职责单一）

- `src/features/<feature>/*`：领域模块、逻辑、process、私有 pattern。
- `src/runtime/*`：Composition Root（imports/processes/layer）。
- `src/scenarios/*`：可运行入口与语义对照。

## 3) 复制后先改这 7 件事

1. 领域命名（feature/module/action）。
2. service 契约与错误模型。
3. 状态切片（保留最小可解释数据面）。
4. 协作方式：默认 declarative，bridge 场景才 blackbox。
5. 写入策略：优先 `mutate/immerReducers`。
6. 场景入口：补业务数据与回收逻辑。
7. 自检：运行一致性清单。

## 4) 三条必守红线

- 同步事务体内不做 IO/dispatch/`run*Task`。
- 跨模块只用只读句柄 + dispatch，不直写他库 state。
- 诊断事件保持 Slim + JsonValue，不塞不可序列化对象。

## 5) 何时升级到 L2/L3

- 改动触及事务语义/诊断协议/锚点稳定性：升 L2（核心路径）。
- 改动触及 Sandbox/Playground 输出契约：升 L3（Alignment Lab）。

## 6) 样板文件索引

- `src/features/customer-search/*`
- `src/runtime/layer.ts`
- `src/runtime/root.impl.ts`
- `src/scenarios/feature-first-customer-search.ts`
- `src/scenarios/process-link-boundary-compare.ts`

## 7) 收尾核对

- 按 `references/consistency-checklist.md` 做文档/脚本/资产一致性检查。
- 按 `references/workflow.md` 的 DoD 收口。
