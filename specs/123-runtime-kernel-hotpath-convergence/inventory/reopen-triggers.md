# Reopen Triggers

| Trigger | Required Evidence | Default Decision |
| --- | --- | --- |
| new real probe failure | current-head probe + affected zone classification | reopen |
| new clean comparable evidence | before/after/diff with `comparable=true` | reopen |
| new product-level SLA pressure | explicit SLA + affected path + target scenario | reopen |
| archive-only historical note | archive article only, no current-head sample | no-go |
| diagnostics-only local gain | only diagnostics=on local win, no default/off comparison | no-go |

## Notes

- reopen 默认只对 steady-state 主线开放
- shell / control plane 的整理类变更默认不触发 reopen
