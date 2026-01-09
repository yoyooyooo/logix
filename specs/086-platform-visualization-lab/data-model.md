# Data Model: Platform Visualization Lab（086）

本特性不引入持久化；数据模型仅用于 UI 组件间的数据流、输入校验与可解释展示。

## Entity: ModuleCandidate

代表一个可供选择的“模块对象输入”（来自 `examples/logix-react/src/modules/*` 的导出）。

- `key: string`：稳定 key（用于下拉选择与 URL/状态存储；默认不要求写入 URL）
- `label: string`：面向用户的显示名（包含导出名与 kind）
- `kind: 'ModuleDef' | 'Module' | 'ModuleImpl' | 'Unknown'`
- `value: unknown`：真实对象（传给 `Reflection.extractManifest` 时可能需要 `as any` 适配类型签名）

## Entity: ExtractManifestOptions（UI）

页面层的可调参数（对应 `@logixjs/core` 的 `ExtractManifestOptions`）。

- `includeStaticIr: boolean`（default: `false`）
- `maxBytes?: number`（default: `undefined`；表示不裁剪）

## Entity: ManifestInput

Diff Viewer 的 before/after 输入统一建模。

- `kind: 'module'`
  - `moduleKey: string`
  - `options: ExtractManifestOptions`
- `kind: 'json'`
  - `jsonText: string`

## Entity: ManifestParseResult

用于承载 JSON 粘贴输入的解析结果。

- `ok: true`
  - `manifest: unknown`（后续按最小字段校验再作为 `ModuleManifest` 使用）
- `ok: false`
  - `error: string`

## Entity: PendingField（UI）

固定的“未来字段/工件”提示清单（对齐 080 总控）。

- `specId: '078' | '031' | '035' | '081' | '082' | '085'`
- `label: string`
- `notes: string`

