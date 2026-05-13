# Research: Docs Runtime Cutover

## Decision 1: 现有 docs alignment stages 草案保留为执行合同

- **Decision**: 将 [docs/superpowers/plans/2026-04-05-docs-alignment-stages.md](../../docs/superpowers/plans/2026-04-05-docs-alignment-stages.md) 视为实施草案与命令清单，`113` 则作为 spec-kit 内的正式 feature contract。
- **Rationale**: 这份草案已经拆好了 chunk、task、检查命令与 reopen 条件，直接复用最省路径。
- **Alternatives considered**:
  - 直接复制整份草案进 `specs/113-*`。否决，原因是会制造第二份任务事实源。
  - 完全抛弃现有草案重写。否决，原因是已有内容已经足够接近执行层。

## Decision 2: `docs/standards/docs-governance.md` 成为唯一路由与升格协议

- **Decision**: 根 README 只做导航，执行细则只认 `docs/standards/docs-governance.md`。
- **Rationale**: 当前根 README 已有导航角色，继续把升格规则写散会导致职责漂移。
- **Alternatives considered**:
  - 在每个 README 都重复升格规则。否决，原因是后续维护成本高，且易发生漂移。

## Decision 3: runtime 文档按 core pack 与 boundary pack 分波次收口

- **Decision**: runtime 01-05 视为 core pack，runtime 06-09 + platform 01/02 视为 boundary pack，分别收口。
- **Rationale**: 两组页面承担的职责不同，先分包有利于 reviewer 做语义门。
- **Alternatives considered**:
  - 一次性重写全部 runtime / platform 页面。否决，原因是回归面过大，难以定位职责串位。

## Decision 4: naming 后置与结构结论分离

- **Decision**: 结构结论停留在 SSoT / standards，命名后置只停留在 `docs/standards/logix-api-next-postponed-naming-items.md`。
- **Rationale**: 结构与命名混写时，任何页面都可能重新开放结构争论。
- **Alternatives considered**:
  - 在各页面各自保留“待定命名”小节。否决，原因是命名会再次分散。

## Decision 5: 未升格事项只进入 `docs/next` 承接桶

- **Decision**: 本轮 followups 统一沉淀到 `docs/next/2026-04-05-runtime-docs-followups.md`。
- **Rationale**: `proposal` 不再承担事实源过渡层，`next` 更适合承接“方向已定、尚未升格”的事项。
- **Alternatives considered**:
  - 继续把 followups 放在 proposal。否决，原因是 proposal 容易被误读为仍在争论。

## Decision 6: 叶子页统一回指单一 followup bucket

- **Decision**: runtime / platform 叶子页的“待升格回写”统一回指 `docs/next/2026-04-05-runtime-docs-followups.md`。
- **Rationale**: 统一 sink 后，维护者不需要再猜“收尾项应该去哪一页”。
- **Alternatives considered**:
  - 每页各自维护独立 next 专题。否决，原因是 followup 会再次分散。
