---
title: Feature-first · 最小闭环样板（逐文件）
---

# Feature-first · 最小闭环样板（逐文件）

目标：给业务开发一个“可复制到任意 Logix 项目”的最小闭环结构，覆盖：

- ModuleDef / Logic / ModuleImpl
- Tag-only Service + Layer 注入
- Process.link 跨模块协作
- Runtime 组合根（imports/processes/layer）
- 单文件可运行入口（确保 dispose）

## 0. 如何使用这份样板

1. 把 `assets/feature-first-customer-search/src` 目录整体复制到你的项目 `src/` 下（按需重命名 feature）。
   - 或用本 skill 内置脚本自动复制（默认不覆盖）：`node /path/to/logix-best-practices/scripts/scaffold-feature-first.mjs --out ./src`
2. 按你的工程约定调整 import 扩展名：
   - 若 TS 配置为 `moduleResolution: NodeNext`（Node ESM），推荐在 `.ts` 里写 `.js` 扩展名；
   - 若走 bundler/tsc + path alias，可去掉 `.js` 扩展名。
3. 在 Composition Root（`src/runtime/layer.ts`）把 mock service 换成真实实现。
4. 运行入口：`pnpm exec tsx src/scenarios/feature-first-customer-search.ts`（或你项目的等价 runner）。

## 1. 目录结构（可直接复制）

```
src/
  features/
    customer-search/
      index.ts
      model.ts
      service.ts

      customerSearch.def.ts
      customerSearch.logic.ts
      customerSearch.impl.ts

      customerDetail.def.ts
      customerDetail.logic.ts
      customerDetail.impl.ts

      patterns/
        autoTriggerSearch.ts

      processes/
        searchToDetail.process.ts

  runtime/
    layer.ts
    root.impl.ts

  scenarios/
    feature-first-customer-search.ts
```

## 2. 逐文件最小写法（直接点开复制）

以下文件均内置在本 skill 的 `assets/feature-first-customer-search/src/`：

- `src/features/customer-search/model.ts`
- `src/features/customer-search/service.ts`
- `src/features/customer-search/customerSearch.def.ts`
- `src/features/customer-search/patterns/autoTriggerSearch.ts`
- `src/features/customer-search/customerSearch.logic.ts`
- `src/features/customer-search/customerSearch.impl.ts`
- `src/features/customer-search/customerDetail.def.ts`
- `src/features/customer-search/customerDetail.logic.ts`
- `src/features/customer-search/customerDetail.impl.ts`
- `src/features/customer-search/processes/searchToDetail.process.ts`
- `src/features/customer-search/index.ts`
- `src/runtime/layer.ts`
- `src/runtime/root.impl.ts`
- `src/scenarios/feature-first-customer-search.ts`

## 3. 你复制后通常需要改什么

- **命名**：把 `customer-search`、`CustomerSearch`、action 名称替换成你的领域语言。
- **State**：只保留“最小可解释数据面”，派生字段优先用 selector/trait 而不是写回 state（除非你明确需要）。
- **Service 契约**：让 Tag 表达业务动词，错误类型用领域化 Error（不要把 `unknown` 直接冒泡到业务层）。
- **Process**：跨模块协作一律落在 `processes/`（或更上层的 use-case coordinator），避免在某个模块内部隐式操控另一个模块。
