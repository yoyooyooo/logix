# Contract: Autofill Report（结构化补全报告）

## 目标

定义一份 Slim/JSON 的补全报告协议，用于：

- CI gate（“哪些文件被改了/哪些没补全/原因是什么”）；
- Devtools/Studio 的解释链路输入；
- 人工审阅（report-only → write-back）。

## Schema（v1，示意）

权威 schema：

- `specs/079-platform-anchor-autofill/contracts/schemas/autofill-report.schema.json`

```ts
type AutofillReportV1 = {
  readonly schemaVersion: 1
  readonly kind: 'AutofillReport'
  readonly mode: 'report' | 'write'
  readonly runId: string
  readonly ok: boolean
  readonly summary: {
    readonly filesTouched: number
    readonly modulesWritten: number
    readonly modulesSkipped: number
    readonly reasons: ReadonlyArray<{ readonly code: string; readonly count: number }>
  }
  readonly changes: ReadonlyArray<{
    readonly file: string
    readonly moduleId?: string
    readonly decisions: ReadonlyArray<
      | { readonly kind: string; readonly status: 'written'; readonly changes: unknown }
      | { readonly kind: string; readonly status: 'skipped'; readonly reason: { readonly code: string; readonly message: string } }
    >
  }>
}
```

## 约束

- 输出必须确定性（同一输入得到同一输出；排序稳定）。
- `reason.code` 必须来自受控枚举（见 `contracts/schemas/autofill-reason-codes.schema.json` 或 `contracts/reason-codes.md`）。
- 报告不是长期权威事实源：权威永远是源码锚点字段。
