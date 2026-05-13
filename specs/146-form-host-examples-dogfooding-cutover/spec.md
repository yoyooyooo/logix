# Feature Specification: Form Host Examples Dogfooding Cutover

**Feature Branch**: `146-form-host-examples-dogfooding-cutover`
**Created**: 2026-04-16
**Status**: Done
**Input**: User description: "将 React host consumption、examples、docs 示例、dogfooding 与 root surface 清理切成独立 member spec，并以零兼容、单轨实施推进实现。"

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: NS-3, NS-4, NS-10
- **Kill Features (KF)**: KF-4, KF-8, KF-9

## Context

当 `141-145` 把底层 contract 收口后，最后一波必须把 host/examples/dogfooding 统一切到新 truth：

- React host 只消费新 contract
- examples 与 docs 不再讲旧心智
- root export / package 使用姿势不再泄漏旧 residue

这份 spec 负责最后一跳。

## Scope

### In Scope

- React host / consumption cleanup
- examples / docs 示例对齐
- dogfooding 路径对齐
- root surface / package-facing cleanup

### Out of Scope

- 不在本 spec 内改底层 truth
- 不在本 spec 内重新定义 report shell、bridge、error carrier、submit verdict、locality

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 维护者能在 examples/docs 中只看到新心智 (Priority: P1)

作为维护者，我希望 examples 和 docs 里只剩新 contract 的使用姿势，不再继续解释旧 residue。

**Traceability**: NS-4, KF-9

**Acceptance Scenarios**:

1. **Given** 我查看 examples/docs，**When** 我寻找 Form 相关使用姿势，**Then** 我只看到新 contract。
2. **Given** 我查看 package root surface，**When** 我判断默认入口，**Then** 我看不到旧 facade。

---

### User Story 2 - 实施者能让 host 与 dogfooding 只消费 living truth (Priority: P2)

作为实施者，我希望 React host 和 dogfooding 不再依赖过时心智或旧示例。

**Traceability**: NS-3, KF-4

**Acceptance Scenarios**:

1. **Given** 底层 cutover 完成，**When** host/example 清理推进，**Then** 它们只消费 living truth。
2. **Given** 某个示例仍引用旧 contract，**When** 对齐后，**Then** 旧引用被直接删除而不是兼容。

---

### User Story 3 - reviewer 能拒绝旧示例并存与迁移壳层 (Priority: P3)

作为 reviewer，我希望能直接拒绝旧 examples 并存、迁移说明壳层长期保留或 root surface 继续带旧入口。

**Traceability**: NS-3, NS-10, KF-4, KF-8

**Acceptance Scenarios**:

1. **Given** 有人提议旧 examples 与新 examples 长期并存，**When** reviewer 对照本 spec，**Then** 能直接否决。
2. **Given** 有人提议保留旧 root export 作为过渡，**When** reviewer 对照本 spec，**Then** 能直接否决。

### Edge Cases

- 若某个 example 还不能升级，应该直接删除或替换，不保留旧口径示例
- docs 必须与 living SSoT 同步

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 让 examples、docs、dogfooding 只消费新 contract。
- **FR-002**: 系统 MUST 删除旧 example / old root surface residue，而不是保留兼容样例。
- **FR-003**: 系统 MUST 让 package-facing 默认入口与 living SSoT 一致。
- **FR-004**: 系统 MUST 采用零兼容、单轨实施，不保留旧示例并存与迁移壳层。

### Key Entities _(include if feature involves data)_

- **Host Consumption Path**: React host 与 package-facing 使用路径。
- **Dogfooding Example**: examples / docs 中承载主心智的示例入口。

### Non-Functional Requirements (Single Narrative)

- **NFR-001**: 用户面叙事必须单线。
- **NFR-002**: docs、examples 与 root surface 不得并行维护两套心智。
- **NFR-003**: 本轮不得引入兼容示例或迁移壳层。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: examples/docs 中不再出现旧 contract 的默认写法。
- **SC-002**: root surface 与 living SSoT 口径一致。
- **SC-003**: reviewer 可直接依据本 spec 否决旧示例并存与旧 root export 过渡方案。
