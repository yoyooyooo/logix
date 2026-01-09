# Specification Quality Checklist: 保守自动补全 Platform-Grade 锚点声明（单一真相源）

**Purpose**: Validate specification completeness and quality before proceeding to planning  
**Created**: 2026-01-09  
**Feature**: `specs/079-platform-anchor-autofill/spec.md`

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- 本 spec 强制“单一真相源”：补全结果只允许回写到源码中的显式锚点声明（依赖锚点/装配锚点/定位锚点）；禁止生成 sidecar 作为长期权威事实源。
- 本 spec 强制“宁可错过不可乱补”：不确定依赖/定位必须跳过并可解释，避免引入错误锚点导致试跑、IR 与全双工链路漂移。
