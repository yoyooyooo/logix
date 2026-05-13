# Research: Form Validation Bridge Cutover

## Decision 1: submit-only decode gate

**Decision**: structural decode 只在 submit lane 激活。
**Rationale**: 这能消掉第二 attempt noun，并让 error lifetime 继续绑在 `submitAttempt`。
**Alternatives considered**: field validate 时也触发 structural decode；保留 pre-submit route。

## Decision 2: normalized decode facts

**Decision**: bridge 只消费 normalized decode facts。
**Rationale**: 避免多 schema vocabulary 继续渗入 Form truth。
**Alternatives considered**: 继续接受 raw schema issue object。

## Decision 3: path-first lowering + submit fallback

**Decision**: decode failure 优先按 path lowering，无法映射时统一回收到 `scope="submit"`。
**Rationale**: 保持单一 fallback law。
**Alternatives considered**: 同时允许 `root` fallback；直接丢弃 unmappable issue。
