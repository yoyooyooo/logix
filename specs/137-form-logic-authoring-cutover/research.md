# Research: Form Logic Authoring Cutover

## Decision 1: Form 默认作者面直接写死

- `rules / derived / fields` 目前都能 lower 到同一个 kernel
- 默认心智必须收成一条，否则作者面永远会继续分叉
- 这一条 canonical path 直接定为 `Form.make + Form.from(schema).logic(...)`

## Decision 2: `Form.Field.*` 与 direct field-kernel 只保留 expert route

- 它们仍有价值
- 但不应与 day-one 默认入口并列

## Decision 3: `errors / ui / $form / validateOn / reValidateOn` 继续留在 Form 领域层

- 这些语义不属于 field-kernel
- field-kernel 继续只承接底层字段能力与统一 writeback contract

## Decision 4: docs/examples/tests 必须跟 root barrel 一起收口

- 只收源码接口不够
- package 心智最终由 root export 与 canonical examples 决定

## Decision 5: top-level `rules / derived` 降级为 legacy route

- 继续保留解析能力，避免阻断必要的 expert/leaf 组合
- 但 runtime 会发出 `form_authoring::legacy_top_level` warning
- artifact warnings 也会把 legacy route 标出来，防止它继续伪装成 canonical path

## Validation Note

- 验证期间曾命中过 `proto 0.50.2` shim 的系统代理探测崩溃
- 当前已升级到 `proto 0.56.0`，常规 `pnpm -C packages/logix-form typecheck` 恢复可用
