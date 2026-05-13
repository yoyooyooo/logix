# Package Ownership

| Package | Role | Allowed Surface | Must Not Grow |
| --- | --- | --- | --- |
| `@logixjs/core` | contract owner | `runtime.check / runtime.trial / runtime.compare` contract、upgrade rules、shared semantics、`@logixjs/core/ControlPlane` | CLI route、browser-only trial plane |
| `@logixjs/cli` | CLI route owner | `check / trial / compare` 一级命令、expert `ir.validate / ir.diff`、archive `trialrun` | 第二 machine report 协议 |
| `@logixjs/test` | test harness owner | shared control-plane consumption、test runtime execution | standalone runtime semantics |
| `@logixjs/sandbox` | browser trial surface owner | `runtime.trial` browser surface、trial artifacts | second evidence protocol |
