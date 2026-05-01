# Data Model: Form Canonical Error Carrier Cutover

## FormErrorLeaf

- role: Form 侧唯一错误 carrier
- origin:
  - `rule`
  - `decode`
  - `manual`
  - `submit`

## Error Tree

- role: 只由 canonical leaf 组成的错误树

## Error Residue

- role: 不再拥有 canonical 身份的旧错误写回位
