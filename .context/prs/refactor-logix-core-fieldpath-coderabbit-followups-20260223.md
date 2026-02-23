# PR Draft: refactor/coderabbit-fieldpath-hardening-20260223

## 目标
- 跟进最近 PR 评论中的 field-path 建议，补齐 `dirtyPathIdsToRootIds` 缺失分支覆盖，降低未来回归风险。
- 在不改变 dirty-set 语义的前提下，显式化 `buildSpecificDirtySetFromIds` 的调用方不变量，移除比较器与主循环中的死分支。

## 模块阅读范围
- `packages/logix-core/src/internal/field-path.ts`
- `packages/logix-core/test/internal/FieldPath/FieldPath.DirtySetReason.test.ts`

## 本轮改动
- `packages/logix-core/src/internal/field-path.ts`
  - `buildSpecificDirtySetFromIds` 排序比较器移除 `if (!ap || !bp)` fallback，改为直接按 `compareFieldPath` 比较。
  - root 收敛主循环移除 `if (!path) continue` 分支，改为使用非空不变量。
- `packages/logix-core/test/internal/FieldPath/FieldPath.DirtySetReason.test.ts`
  - 新增 id fast-path 的 4 个回归用例：
    - 空输入 -> `unknownWrite`
    - 负 id -> `nonTrackablePatch`
    - `dirtyAllReason` short-circuit 保留
    - invalid + missing 并存时 invalid 优先（`nonTrackablePatch`）

## 风险与取舍
- 风险：把“静默 fallback”改成类型不变量后，若未来调用方绕过前置校验，问题会更早暴露。
- 取舍：当前 id 入口均已在调用前完成校验，保留死分支只会掩盖错误并增加噪音，因此本轮优先显式化不变量。

## 验证
- `pnpm typecheck`
- `pnpm test:turbo`

## 独立审查
- Reviewer：subagent `019c8abc-4ae2-7a90-84c6-d9883da9f00f`（explorer，只读）
- 结论：无阻塞问题；提示 1 条低风险项（未来若新增未校验 id 入口，显式不变量会更早抛错而非静默降级）。
