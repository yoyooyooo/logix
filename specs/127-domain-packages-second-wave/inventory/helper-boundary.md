# Helper Boundary

| Package | Helper Surface | Allowed Role | Rejection Rule |
| --- | --- | --- | --- |
| `@logixjs/query` | `Engine / TanStack / fields` | capability / integration helper | `source` 只停在 fields 子模块，不得在 root 再长第二 helper 面 |
| `@logixjs/i18n` | `Token`、辅助 snapshot 投影 | token / helper | 不得把 projection 升成包内默认主入口 |
| `@logixjs/domain` | 少量 commands / api helper | convenience only | 不得与 state / actions 并行形成第二核心面；不再回到 `*Module` 命名主叙事 |
