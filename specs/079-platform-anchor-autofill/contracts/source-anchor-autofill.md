# Contract: dev.source 定位锚点补全

## 目标

为缺失定位元数据的对象补齐 `dev.source`，以支持：

- Devtools 解释链路跳转
- 平台侧 code link / blame / traceability

## 写回形态（示意）

```ts
dev: { source: { file: 'path/to/file.ts', line: 12, column: 3 } }
```

## 约束

- 该锚点是 dev-only：不应进入结构 digest（避免代码移动造成 CI 噪声）。
- file 路径必须稳定（建议仓库相对路径）；line/column 允许随编辑变化，但必须与当前源码一致。

