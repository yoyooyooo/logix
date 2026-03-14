# Effect v4 长期分支与 Beta 发布策略

## 目标

- `main` 继续作为稳定线。
- `effect-v4` 升格为长期 `next` 分支，承接所有 Effect v4 主线开发。
- 对外 npm 发布新增 `beta` 通道，先服务于 `effect-v4`，不碰 `latest`。

## 分支角色

- `main`
  - 保持稳定线和默认基线。
  - 继续承接当前非 v4 主线工作。
- `effect-v4`
  - 作为 Effect v4 的长期集成分支。
  - 所有 v4 相关 PR 默认都以它为 base。
  - 对外 Beta 版本只从这里产出。

## 同步规则

- 采用单向常规同步：`main -> effect-v4`。
- 同步方式统一走 sync PR，避免直接把 `main` 的变化硬塞到 `effect-v4`。
- `effect-v4 -> main` 暂不作为日常动作，等 Effect v4 正式 GA 再做总切换。

## 版本策略

- 引入 Changesets 统一管理 public packages 版本。
- 当前 Beta 线把以下公共 `@logixjs/*` 包视为同一发布列车：
  - `@logixjs/core`
  - `@logixjs/core-ng`
  - `@logixjs/devtools-react`
  - `@logixjs/domain`
  - `@logixjs/form`
  - `@logixjs/i18n`
  - `@logixjs/query`
  - `@logixjs/react`
  - `@logixjs/test`
- `@logixjs/cli` 暂不纳入首轮 Beta 列车，单独等待 npm 首发路径收口。
- `@logixjs/sandbox` 暂不纳入首轮 Beta 列车，单独等待 kernel 产物链收口。
- `speckit-kit` 不属于这条发布线，先从 Changesets 中忽略。
- 当前 Beta 通道使用 npm `dist-tag=beta`。在 Effect v4 正式 GA 之前，不切到 `latest`。

## 发布流程

1. 开发者向 `effect-v4` PR 提交 release-worthy 变更时，附带一个 changeset。
2. PR 合入 `effect-v4` 后，`release.yml` 会在该分支上运行。
3. 如果存在待发布 changesets，Changesets Action 会创建或更新版本 PR：
   - 标题：`chore(release): version beta packages`
4. 版本 PR 通过现有 PR 门禁后，由维护者合入 `effect-v4`。
5. 合入版本 PR 后，`release.yml` 再次运行：
   - 复跑 release lane 校验
   - 复跑 browser smoke
   - 执行 `changeset publish --tag beta`

## 发布认证机制

- 发布认证使用 npm Trusted Publishing（GitHub Actions OIDC）。
- workflow 依赖：
  - GitHub Actions `id-token: write`
  - Node 22
  - npm `11.5.1+`
- 这条线不依赖 `NPM_TOKEN`。
- npm 侧需要把这批 `@logixjs/*` 公共包的 Trusted Publisher 指向：
  - repo: `yoyooyooo/logix`
  - workflow: `.github/workflows/release.yml`
- 当前 `effect-v4` 只发布 `beta`，后续正式版也继续复用这个 workflow 文件名，再按分支或发布条件切 stable 逻辑。

## 质量门

- 常规开发门禁仍沿用现有 PR checks：
  - `ci / verify`
  - `codex-review / review`
  - `logix-perf (quick) / perf-quick`
- Beta 发布 workflow 额外复跑：
  - `pnpm check:effect-v4-matrix`
  - `pnpm build:pkg`
  - `pnpm typecheck`
  - `pnpm typecheck:test`
  - `pnpm test:turbo`
  - `pnpm test:browser:release`

## Browser smoke 裁决

- 当前 Beta 发布 workflow 不直接跑根脚本 `pnpm test:browser`。
- 原因有两个：
  - `packages/logix-sandbox test:browser` 仍依赖尚未完成的 kernel bundle 收口，当前不适合作为 npm Beta 发布硬门。
  - `effect-v4` 发布线当前更关心 `@logixjs/react` 的可发布 browser 集成面。
- 所以发布前 browser 门先收敛为 targeted smoke：
  - `pnpm -C packages/logix-react exec vitest run test/browser/browser-environment-smoke.test.tsx --project browser`
- 更重的 browser / perf 回归继续通过现有 PR checks 和专项 workflow 承担。

## 维护约定

- 如果某个公共包暂时不具备稳定 publish 面，先修复其 `publishConfig` 或从 Beta 列车移出，不能带病发布。
- 如果未来需要从 `main` 恢复稳定发版：
  - 单独恢复 stable release workflow
  - 把 Changesets 的 `baseBranch` 切回稳定线
  - 再裁决是否继续保留 `effect-v4` 作为下一条实验线

## 迁移到 GA 的出口

- 条件满足后再做一次总切换：
  - Effect v4 正式发布且上游依赖稳定
  - `effect-v4` 与 `main` 的剩余差异已收敛
  - Beta 用户验证完成
- 切换动作：
  - 合并 `effect-v4 -> main`
  - 停用 Beta-only workflow
  - 将 npm 默认发布从 `beta` 切到 `latest`
