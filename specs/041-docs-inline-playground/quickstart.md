# Quickstart: 文档内联教学 Playground

**Date**: 2025-12-26  
**Feature**: [041-docs-inline-playground](./plan.md)

## 目标

让文档作者在 MDX 中显式声明“可运行示例块 + 观察点 + 默认面板/难度”，读者可以在页面内编辑并重跑。

## 本地运行文档站点

```bash
pnpm -C apps/docs dev
```

文档入口为 `/{lang}/docs`（例如 `/zh/docs`、`/en/docs`）。

## 在 MDX 中添加一个可运行示例（建议写法，MVP）

在目标页面（`apps/docs/content/docs/**/*.mdx`）中插入一个 Playground 组件（示例 API 以实现落地为准）：

```mdx
<Playground
  title="第一个可运行示例"
  level="basic"
  moduleExport="AppRoot"
  observe={[
    "运行后应看到：…",
    "修改 X 后应观察到：…",
  ]}
>
{`
// 示例代码：作者提供的初始版本
export const AppRoot = ...
`}
</Playground>
```

## 推荐实践（作者侧）

- 观察点保持 1–3 条，直接指向“运行后应该看哪里/如何判断是否符合预期”。  
- 普通教程默认 `level="basic"`，不要暴露 Trace/时间线；高级/Debug 页面才用 `level="debug"`。  
- 运行示例尽量避免依赖外部网络与不可控环境，以提高可复现性与学习体验稳定性。
