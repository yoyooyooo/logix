# Docs Full Coverage Group Checklist

**Group**: `specs/120-docs-full-coverage-roadmap`
**Derived From**: `registry`
**Members**: `specs/103-effect-v4-forward-cutover`, `specs/113-docs-runtime-cutover`, `specs/115-core-kernel-extraction`, `specs/116-host-runtime-rebootstrap`, `specs/117-domain-package-rebootstrap`, `specs/118-cli-rebootstrap`, `specs/119-examples-verification-alignment`, `specs/121-docs-foundation-governance-convergence`, `specs/122-runtime-public-authoring-convergence`, `specs/123-runtime-kernel-hotpath-convergence`, `specs/124-runtime-control-plane-verification-convergence`, `specs/125-form-field-kernel-second-wave`, `specs/126-host-scenario-patterns-convergence`, `specs/127-domain-packages-second-wave`, `specs/128-platform-layered-map-convergence`, `specs/129-anchor-profile-static-governance`
**Created**: 2026-04-06

> 本文件是执行索引清单，只做跳转、gate 和 coverage 收口，不复制成员 spec 的实现 tasks。

## Group Gates

- [x] 已有依赖 spec `103 / 113 / 115 / 116 / 117 / 118 / 119` 已纳入 registry
- [x] 新成员 spec `121` 到 `129` 已创建 `spec.md`
- [x] 新成员 spec `121` 到 `129` 已创建 `checklists/requirements.md`
- [x] 新成员 spec `121` 到 `129` 已创建 `plan.md / research.md / data-model.md / contracts/README.md / quickstart.md / tasks.md`
- [x] `120/spec-registry.json` 与 `120/spec-registry.md` 已建立 docs coverage SSoT
- [x] docs 纳入范围的页面已在 coverage matrix 建立 primary owner

## Existing Coverage Baseline

- [x] `103` 承接 Effect V4 baseline
- [x] `113` 承接 docs root/runtime/platform 第一波 cutover
- [x] `115` 承接 kernel extraction 第一波
- [x] `116` 承接 host runtime 第一波
- [x] `117` 承接 domain package 第一波
- [x] `118` 承接 CLI 第一波
- [x] `119` 承接 examples / verification 第一波

## New Member Entry Points

- [x] `121` docs foundation / governance convergence
  入口：`specs/121-docs-foundation-governance-convergence/spec.md`
- [x] `122` runtime public authoring convergence
  入口：`specs/122-runtime-public-authoring-convergence/spec.md`
- [x] `123` runtime kernel hotpath convergence
  入口：`specs/123-runtime-kernel-hotpath-convergence/spec.md`
- [x] `124` runtime control plane / verification convergence
  入口：`specs/124-runtime-control-plane-verification-convergence/spec.md`
- [x] `125` form / field-kernel second wave
  入口：`specs/125-form-field-kernel-second-wave/spec.md`
- [x] `126` host scenario patterns convergence
  入口：`specs/126-host-scenario-patterns-convergence/spec.md`
- [x] `127` domain packages second wave
  入口：`specs/127-domain-packages-second-wave/spec.md`
- [x] `128` platform layered map convergence
  入口：`specs/128-platform-layered-map-convergence/spec.md`
- [x] `129` anchor / profile / static governance
  入口：`specs/129-anchor-profile-static-governance/spec.md`

## Suggested Execution Order

- [x] 先推进 `121`
- [x] 再并行推进 `122 / 123 / 124`
- [x] 然后推进 `125 / 126 / 127`
- [x] 最后推进 `128 / 129`

## Notes

- 若需要查 docs 页面与 spec owner 的精确映射，优先看 `specs/120-docs-full-coverage-roadmap/spec-registry.md`
- 当前 `speckit` 自带 `spec-group-checklist.sh` 存在 shell 语法错误，本清单为等价手工回退产物
