# Research: Kernel Selector Route Contract

## Decision 1: Core Owns Precision And Route

**Decision**: Selector precision classification and route decision are owned by core runtime. React host must consume the returned route.

**Rationale**: The failure class is not a React component split problem. A broad or dynamic selector can still subscribe through a broad module topic after UI decomposition. A single core decision surface prevents React from maintaining a second eligibility policy.

**Alternatives considered**:

- React-owned strict gate: rejected because it creates a second owner for broad/dynamic classification.
- UI-only component decomposition: rejected because it cannot guarantee subscription precision.
- Separate React hook family: rejected because it expands public surface and weakens Agent generation stability.

## Decision 2: Public No-Arg Host Read Is Removed

**Decision**: Public `useSelector(handle)` is outside the terminal host contract. Whole-state reads are repo-internal Devtools, debug, or test harness concerns.

**Rationale**: Whole-state host read is type-safe but subscription-imprecise. Keeping the overload visible lets users and Agents generate broad reads by default.

**Alternatives considered**:

- Keep overload but remove from examples: rejected because Agents can still discover it through types.
- Keep overload with warnings: rejected because warnings do not close dev/test strict policy.
- Add compatibility period: rejected by forward-only project policy.

## Decision 3: Selector Input Remains The Public Concept

**Decision**: Public authoring language is limited to selector input, broad read, and dynamic selector fallback. Default generated reads use `fieldValue(path)` and domain selector primitives.

**Rationale**: This preserves a single hook gate and avoids exposing internal runtime nouns as public authoring concepts.

**Alternatives considered**:

- Public `ReadQuery`: rejected by prior internalization authority.
- New `select.*` namespace: deferred to separate reopen because it adds public surface.
- Public object/struct projection descriptor: rejected because it increases shape surface and can be handled through multiple local selectors or module computed state.
- Function selector as L0/L1 recipe: rejected because it is easy for Agents to generate dynamic, object-returning, or broad selectors.

## Decision 4: Selector Fingerprint Is Topic Identity

**Decision**: Selector topic identity must use a fingerprint that covers static shape, reads, equality semantics, projection/operator shape, and path-authority digest or epoch. Selector id remains a diagnostic label.

**Rationale**: Current selector-id-only reuse can collide when two selectors share an id but differ in shape or route authority. Fingerprint identity prevents incorrect graph entry reuse and read-topic subscription collisions.

**Alternatives considered**:

- Keep selector id as identity: rejected because it cannot prove shape equality.
- Use only reads digest: rejected because two different projections can share read paths.
- Use function source as identity: rejected because source is brittle and not the public contract.

## Decision 5: Dirty/Read Path Authority Is Shared

**Decision**: Read paths and dirty paths must normalize through one internal path-id authority. Dirty-side precision loss is part of the same strict policy as read-side broad/dynamic fallback.

**Rationale**: Exact read subscriptions only help if write-side dirty evidence can be compared precisely. Dirty-all or missing path authority can force evaluate-all behavior and recreate fanout.

**Alternatives considered**:

- Treat dirty loss as diagnostic-only: rejected because silent fallback preserves the defect.
- Flatten state roots by default: rejected because state shape is not the owner of path precision.
- Allow evaluate-all as normal route: rejected because it hides precision loss.

## Decision 6: Verification Control Plane Is Layered

**Decision**: `runtime.check` reports only static selector-quality artifacts it can see. Startup trial may verify selector policy wiring. Host projection precision enters reports only through explicit host evidence, scenario evidence, or repo-internal host harness evidence.

**Rationale**: Static and startup stages cannot legitimately observe React commits or subscription fanout. Keeping layer boundaries prevents a second report truth.

**Alternatives considered**:

- Let `runtime.check` report host render isolation: rejected because it would claim evidence it cannot observe.
- Always require host deep verification: rejected because default gates must remain cheap.
- Raw trace as default compare surface: rejected by verification-control-plane SSoT.

## Decision 7: Large Dirty Precision Work Requires Decomposition

**Decision**: Because `StateTransaction.ts` is over 1000 LOC, dirty precision implementation must start with an isolated no-behavior-change split before semantic dirty fallback changes in that file.

**Rationale**: Dirty precision touches transaction state, patch extraction, inferred dirty information, and snapshot assembly. Keeping this inside one large file increases risk and conflict surface.

**Alternatives considered**:

- Direct semantic patch in the large file: rejected by module-size governance.
- Full rewrite: rejected because a no-behavior split is enough to isolate responsibilities first.

## Decision 8: Discussion Is Non-Blocking Reopen Memory

**Decision**: Create `discussion.md` only for deferred reopen candidates and implementation watchpoints. It contains no must-close implementation blocker.

**Rationale**: T2 already settled owner and public surface. Remaining uncertainty is about future helper admission and performance evidence, which should not block planning.

**Alternatives considered**:

- No discussion file: rejected because the user explicitly allowed it and there is useful reopen evidence to preserve.
- Put reopen candidates in spec.md: rejected because spec.md should hold active requirements, not deferred candidates.
