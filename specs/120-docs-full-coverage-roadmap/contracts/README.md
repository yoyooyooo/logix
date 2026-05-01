# Contracts: Docs Full Coverage Roadmap

本特性没有外部 HTTP 合同，只有 docs coverage 与 spec routing 合同。

## 1. Coverage Contract

- 纳入范围内的 docs 页面必须 100% 出现在 `spec-registry.md` 的 coverage matrix 中
- 每个页面必须有唯一 primary owner spec

## 2. Group Registry Contract

- member 关系与状态只认 `spec-registry.json`
- 人读说明只认 `spec-registry.md`
- 两者必须同步回写

## 3. Routing Contract

- existing coverage 与 new member specs 必须可区分
- cross-cutting 页面允许 related specs，但不得没有 primary owner

## 4. Group Checklist Contract

- checklist 只做跳转、gate 与执行顺序，不复制 member 的实现 tasks
