---
title: Standardized Scenario Patterns
status: living
version: 14
---

# Standardized Scenario Patterns

## 当前总规则

所有标准示例统一遵守：

- `Module` 承接定义期
- `Module.logic(...)` 承接 canonical 行为声明入口
- `Program` 承接装配期
- `Runtime.make(Program)` 负责运行治理
- `RuntimeProvider` 提供 React 子树的 runtime scope
- React 全局实例默认读 `ModuleTag`
- `ModuleTag` 的 authority 固定在 host lookup law，不进入 core canonical spine 主链
- React 局部实例默认按 `Program` 语义组织
- imported child resolution 默认看 parent instance scope
- field-level declaration 只通过 `Module.logic(...)` 内的 builder 局部语法进入公开作者面

## 业务概念映射速记

- `Module`：看业务边界与状态边界
- `Logic`：看行为、规则和协调；canonical 入口固定挂在 `Module.logic(...)`
- `Program`：看挂载、复用与组合单元
- `Runtime`：看应用、页面、子树或会话级运行容器

这条映射服务两个目标：

- 让业务作者更容易把页面、列表、表单、详情和协调逻辑放到正确层级
- 让 Agent 在生成代码时优先使用单一组合公式，而不是按复杂度临时发明新装配方式

## 当前代表场景

### 1. 全局单例模块

- `useModule(ModuleTag)` 读取当前 runtime tree 中已安装的全局实例

### 2. 局部 Program 实例

- `useModule(Program)` 在组件内构造局部实例
- `key / gcTime / suspend / initTimeoutMs` 继续保留为局部实例协议变体

### 3. imported child resolution

- `host.imports.get(ModuleTag)` 按 parent instance scope 解析 child 实例
- `useImportedModule(parent, ModuleTag)` 只是 `host.imports.get(ModuleTag)` 的 hook 形态
- Logic 侧 imported-child read 固定写法是 `const child = yield* $.imports.get(ModuleTag)`，随后使用 `yield* child.read(selector)` 或 `yield* $.on(child.changes(selector))`
- `$.use(ModuleTag)` 不再作为 imported-child canonical child-read route
- 同一 parent scope 内，一个 `ModuleTag` 只能绑定一个 child 实例
- 若直接导入两个来自同一 `Module` 的 child `Program`，系统应 fail-fast

### 4. 服务注入与 verification 邻接

- 默认注入面是 `Program.capabilities.services`
- imported program 若需要进入 canonical root 装配，默认写入 `Program.capabilities.imports: [ChildProgram]`
- 运行式验证的 canonical 邻接样例默认写 `Runtime.trial(Program, options)`
- verification 邻接入口继续落在 `examples/logix/src/verification/**`

### 5. 后台职责与 field-kernel

- 日常作者默认优先 `logic` 家族
- field-kernel declaration 通过 `$.fields(...)` 接入 `Logic`
- 不存在独立公开的 field-kernel / field expert 路径
- 标准场景不再引入独立公开的 orchestration 家族

### 6. CRUD 管理页的推荐映射

一个典型 CRUD 管理页，默认不要从“单页面单模块”起手。更推荐把它组织成一棵 program tree。

推荐结构：

- `ListModule / ListProgram`
  - 承接列表数据、筛选、分页、排序、选择态
- `EditorModule / EditorProgram`
  - 承接表单草稿、校验、提交中状态、保存结果
- `DetailModule / DetailProgram`
  - 承接当前选中项详情、详情加载状态、抽屉或面板开关
- `BulkActionModule / BulkActionProgram`
  - 承接批量操作确认、批量执行状态、结果反馈
- `PageModule / PageProgram`
  - 承接页级协调逻辑；状态可以很薄，甚至接近空壳

推荐 `Logic`：

- `list-fetch`
- `list-refresh`
- `editor-submit`
- `editor-reset`
- `detail-load`
- `bulk-delete`
- `page-coordinate-selection-to-detail`

推荐 root 组合：

```ts
const PageProgram = Logix.Program.make(PageModule, {
  initial: {},
  capabilities: {
    imports: [ListProgram, EditorProgram, DetailProgram, BulkActionProgram],
  },
  logics: [PageCoordinatorLogic],
})
```

默认心智：

- `Module / Logic` 先表达局部边界与行为
- `Program` 再把这些局部单元收敛成页面级可挂载业务结构
- `Runtime` 最后承接页面、子树或会话的运行边界

## host projection 与非主叙事示例

以下能力继续存在，但不再算 runtime 主叙事里的标准场景：

- 宿主局部 `imports` slot / imported 子实例
- `RuntimeProvider.layer`
- `useImportedModule(...)` 作为 parent-scope helper 保留，但不单列为独立主路径
- 已退出当前舞台的 host residue 不再作为标准场景或 package-local helper 继续出现

## 当前最小示例锚点

当前只固定能直接服务主叙事的最小锚点：

| 场景 | 当前最短示例 | 相关 verification | 说明 |
| --- | --- | --- | --- |
| 全局单例模块 | [GlobalRuntimeLayout.tsx](../../../examples/logix-react/src/demos/GlobalRuntimeLayout.tsx) | [examples/logix/src/verification/index.ts](../../../examples/logix/src/verification/index.ts) | 展示 `useModule(ModuleTag)` 读取共享实例 |
| 局部 Program 实例 | [LocalModuleLayout.tsx](../../../examples/logix-react/src/demos/LocalModuleLayout.tsx) | [instance-scope.contract.test.tsx](../../../packages/logix-react/test/Hooks/instance-scope.contract.test.tsx) | 展示 `useModule(Program)` 在组件内构造局部实例 |
| session instance | [SessionModuleLayout.tsx](../../../examples/logix-react/src/demos/SessionModuleLayout.tsx) | [instance-scope.contract.test.tsx](../../../packages/logix-react/test/Hooks/instance-scope.contract.test.tsx) | 展示 `key + gcTime` 会话实例 |
| suspend variant | [SuspenseModuleLayout.tsx](../../../examples/logix-react/src/demos/SuspenseModuleLayout.tsx) | 无 | 展示 `suspend: true` 作为局部实例协议变体 |

host-only 参考锚点：

- [DiShowcaseLayout.tsx](../../../examples/logix-react/src/demos/DiShowcaseLayout.tsx)
- [LayerOverrideDemoLayout.tsx](../../../examples/logix-react/src/demos/LayerOverrideDemoLayout.tsx)

当前不再单列的变体：

- `key + gcTime` 与 `suspend: true` 继续视为局部实例协议变体
- field-kernel 只作为内部 compiler 层存在，不单列公开锚点

宿主对齐补充：

- `@logixjs/react` 继续只承接 host projection
- `examples/logix-react/**` 继续承接 primary scenario examples
- `examples/logix/src/verification/**` 继续承接 verification subtree
- `@logixjs/sandbox` 继续是 browser trial surface，不并入 projection
- 这些入口都不得定义新的 runtime truth source 或第二 verification control plane
- `examples/logix-react/src/scenarioAnchors.ts` 只算 package-local registry，不算 runtime SSoT 锚点

## 来源裁决

- [../../adr/2026-04-04-logix-api-next-charter.md](../../adr/2026-04-04-logix-api-next-charter.md)
- [../../adr/2026-04-05-ai-native-runtime-first-charter.md](../../adr/2026-04-05-ai-native-runtime-first-charter.md)
- [../../adr/2026-04-12-field-kernel-declaration-cutover.md](../../adr/2026-04-12-field-kernel-declaration-cutover.md)

## 相关规范

- [./03-canonical-authoring.md](./03-canonical-authoring.md)
- [./05-logic-composition-and-override.md](./05-logic-composition-and-override.md)
- [../form/README.md](../form/README.md)
- [./06-form-field-kernel-boundary.md](./06-form-field-kernel-boundary.md)
- [./10-react-host-projection-boundary.md](./10-react-host-projection-boundary.md)
- [./09-verification-control-plane.md](./09-verification-control-plane.md)
- [../../standards/logix-api-next-guardrails.md](../../standards/logix-api-next-guardrails.md)

## 当前一句话结论

标准场景继续围绕 `Module / Logic / Program / Runtime` 组织；业务作者默认把 CRUD、页面级组合和局部复用理解为 program tree，而不是单页面巨型模块；已退出当前舞台的 host residue 不再进入标准场景。
