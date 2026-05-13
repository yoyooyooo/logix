---
title: Browser Route Acceptance Runners
status: internal
version: 1
last-updated: 2026-04-29
---

# Browser Route Acceptance Runners

## 结论

Route-level browser acceptance 默认使用 direct Playwright。

Vitest Browser Mode 继续适合轻量 browser/component 测试、provider smoke 和 HMR 类合约，但不作为 examples Playground route/layout acceptance 的默认门禁。

## 适用范围

当前结论来自 166 Playground route 验收：

- route: `examples/logix-react` 的 `/playground` 与 `/playground/:id`
- target: full route、真实 Vite app、真实 Chromium、固定 viewport、layout overflow、scroll ownership
- command: `pnpm -C examples/logix-react test:browser:playground`

## 背景

166 需要证明 Playground 的 route 级 UI contract：

- `1366x768` 下页面 body 不拥有垂直滚动。
- 五个稳定 region 可见且不重叠。
- 五个 pressure routes 可打开。
- action/state pressure 由 Runtime inspector 内部区域滚动。
- diagnostics/trace pressure 由 bottom evidence drawer 内部内容滚动。
- bare `/playground` 可打开默认 project。

这些断言更接近页面级验收，而不是组件级 browser test。

## 观察到的问题

Vitest Browser Mode 在 examples Playground route suite 中表现不稳定：

- Chromium/provider smoke 能通过，说明浏览器本身可用。
- Playground route 测试会卡在 collect/startup 或 route module graph 阶段。
- 常见表现是 Vitest 打印 `RUN` 后没有 reporter 级测试体进度。
- 单文件和单 test name 过滤也可能卡住。
- 某些诊断运行能进入断言，但后续同类命令又回到启动阶段卡住。

这说明风险集中在 Vitest Browser Mode 对 examples route module graph 的启动路径，而不在 Chromium 或 Playwright browser provider 本身。

## 采用 direct Playwright 的原因

Direct Playwright 更适合当前验收面：

- 它直接启动 examples Vite dev server，再通过 Chromium 访问真实 route。
- `page.goto`、viewport、locator、bounding box 和 scrollHeight 都对应页面级验收。
- 失败时可以收敛到真实 URL、DOM、layout 和 browser console。
- 不需要把 React route suite 放进 Vitest Browser Mode 的 collect/startup 路径。
- 不新增 public API，也不改变 Playground 产品语义。

## 当前命令

```bash
pnpm -C examples/logix-react test:browser:playground
```

该命令运行：

```text
tsx test/browser/playground-route-contract.playwright.ts
```

覆盖：

- default desktop shell regions
- pressure fixture shell regions
- inspector local scroll ownership
- bottom drawer local scroll ownership
- bare route opens default project

## Runner 分工

| 验收面 | 默认 runner | 说明 |
| --- | --- | --- |
| route-level layout acceptance | direct Playwright | 真实 route、viewport、overflow、scroll ownership |
| component/browser interaction | Vitest Browser Mode | 轻量组件、局部 DOM、browser environment API |
| HMR/browser carrier contract | Vitest Browser Mode | 现有 HMR smoke 与 carrier 行为仍可保留 |
| package unit/contract tests | Vitest node/jsdom/happy-dom | 不需要真实 browser route 的行为 |

## 不升格为全局 standard 的原因

当前证据只覆盖 examples Playground route。它足以决定 166 的 route/layout acceptance runner，但还不足以规定全仓所有 browser 测试都迁到 direct Playwright。

若后续多个 route-level acceptance 都复现同类问题，再考虑升格到 `docs/standards/**`。

## 证据入口

- Playground 产品事实源：[Playground Product Workbench](../../ssot/runtime/17-playground-product-workbench.md)
- 166 具体验证记录：[Verification Notes](../../../specs/166-playground-driver-scenario-surface/notes/verification.md)
- direct Playwright 脚本：[playground-route-contract.playwright.ts](../../../examples/logix-react/test/browser/playground-route-contract.playwright.ts)
