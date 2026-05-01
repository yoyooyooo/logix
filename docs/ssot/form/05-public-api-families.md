---
title: Form Public API Families
status: living
version: 9
---

# Form Public API Families

## 目标

把 Form 公开 API route 压成由 runtime spine 派生出来的最小 boundary。

## 页面角色

- 本页只冻结 route-level boundary、authority owner 与负约束
- exact names / signatures 统一看 [13-exact-surface-contract.md](./13-exact-surface-contract.md)
- core React host law 统一看 [../runtime/10-react-host-projection-boundary.md](../runtime/10-react-host-projection-boundary.md)
- 本页不再承接 future helper noun 列表

## route-level boundary

### A. domain authoring route

- acquisition path：`@logixjs/form`
- owner：Form
- 承接：
  - domain declaration act
  - domain DSL
  - path / schema mapping、rule helpers、consumer-attached local remote dependency declaration
  - consumer-attached local soft fact declaration，例如 `field(path).companion(...)`
  - data-support namespaces，例如 `Form.Error`、`Form.Companion`

### B. domain runtime handle route

- acquisition path：returned `FormProgram` 在 runtime / host 中 materialize 后得到的 form handle
- owner：Form
- 承接：
  - effectful domain commands
  - submit lane
  - field / list mutation

### C. core React host route

- acquisition path：`useModule(Program, options?)`、`useSelector(handle, selector, equalityFn?)`
- owner：core runtime
- 承接：
  - host acquisition
  - pure projection
  - selector law

Form 在这条 route 上没有第二套 owner。
sanctioned optional read helpers 固定属于 core host law，exact noun 与 import shape 统一看 [../runtime/10-react-host-projection-boundary.md](../runtime/10-react-host-projection-boundary.md)。
Form 侧只保留 data-support namespace，exact noun 统一看 [./13-exact-surface-contract.md](./13-exact-surface-contract.md)。
官方 toolkit 若提供 form DX wrapper，它也只能停在 [../runtime/11-toolkit-layer.md](../runtime/11-toolkit-layer.md) 的 secondary layer，不回到 Form route。
`@logixjs/form/react` 与仓内任何 repo-local `useForm*` / list wrapper 都只算 alias / residue，不回到 Form route。

## surface budget

Form 自己只拥有两条 domain route：

- root authoring route
- effectful runtime handle route

host 与 pure projection route 继续回到 core runtime law。

`Form.Error / Form.Companion` 不构成第三 route。
它们只允许作为 root route 上的 data-support namespace 存在。
当前若需要 field error、field companion 或 row-owner companion selector primitive，也继续只作为 `Form.Error / Form.Companion` 的 data-support 扩展存在，不形成新的 host 或 projection route。
`Form.Companion` 若出现在 root export，只表示 data-support namespace visibility，不改 route owner、truth owner 或 host gate owner。

## 负约束

以下方向继续拒绝：

- Form 拥有 canonical React hook family
- Form 拥有 pure projection family
- Form package 预承诺官方 React factory / builder / wrapper family
- Form 拥有第二 assembly law 或第二 composition law
- `Form.Error` 长成 package-local projection / render route
- `Form.Companion` 长成 package-local projection / read route、host hook family 或 helper family
- local remote dependency 长成 form-level remote subsystem
- package-local alias 长成 authority
- sibling page 持有第二 exact contract

## teaching corollary

semantic closure 对用户面的唯一 corollary 继续固定为：

1. `Form.make(...)`
   其中：
   - local remote dependency 的 canonical 用户写法固定为 `field(path).source({ resource, deps, key, submitImpact?, ... })`
   - local soft fact 的 canonical 用户写法固定为 `field(path).companion({ deps, lower })`
2. `useModule(formProgram, options?)`
3. `useSelector(handle, selector, equalityFn?)`
4. `Form.Error / Form.Companion` 只做 data-support

这条 corollary 只服务 examples 与用户教学。
它不反向成为新的 route owner。

## Reopen Gate

后续只有在同时满足下面条件时，才允许重开：

- 新 noun 能直接映射到 root DSL、effectful handle 或 core host law
- 它能删掉一个旧 boundary、旧 alias 或旧特例
- 它不会让 Form 长出第二 host truth 或 pure projection family

## 相关规范

- [./00-north-star.md](./00-north-star.md)
- [./13-exact-surface-contract.md](./13-exact-surface-contract.md)
- [../capability/03-frozen-api-shape.md](../capability/03-frozen-api-shape.md)
- [../runtime/01-public-api-spine.md](../runtime/01-public-api-spine.md)
- [../runtime/06-form-field-kernel-boundary.md](../runtime/06-form-field-kernel-boundary.md)
- [../runtime/10-react-host-projection-boundary.md](../runtime/10-react-host-projection-boundary.md)

## 当前一句话结论

Form 公开 API 当前只保留两条 domain route：root authoring 与 effectful runtime handle；`field(path).source({ resource, deps, key, submitImpact?, ... })` 与 `field(path).companion({ deps, lower })` 都属于 root authoring route 内的 consumer-attached DSL，React host acquisition 与 pure projection 已回到 core-owned host law，`Form.Error` 与 `Form.Companion` 只保留 data-support 身份，不再被允许长成第三 route。
