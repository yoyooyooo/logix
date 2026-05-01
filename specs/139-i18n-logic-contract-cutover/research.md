# Research: I18n Logic Contract Cutover

## Decision 1: I18n 继续坚定 service-first

- `08-domain-packages` 已明确服务能力与 token contract 是主身份
- package root 的终局直接写成 keep 或 remove 或 move ledger，比“后面再看”更稳
- projection 不再允许抬成 package 默认主入口

## Decision 2: driver lifecycle wiring 接到 shared declaration contract

- async ready、reset、观察语义都属于接线问题
- 这层不应在包内长成独立 lifecycle 家族
- 当前已通过 driver lifecycle boundary 与 ready or isolation 回归把这条边界钉住

## Decision 3: root/global 解析语义降到 expert route

- 某些场景仍需要 fixed root
- 这层不能回 day-one 主写法

## Decision 4: token contract 继续保持稳定可序列化

- 收口不能削弱 token 的稳定锚点角色
- service-first 叙事要和 token contract 一起保持稳定

## Decision 5: root boundary 需要 runtime 精确断言

- package root 已通过 boundary tests 锁成六个稳定值导出
- projection 或 module helpers 不允许再从 root 漏回

## Validation Note

- 验证期间曾命中过 `proto 0.50.2` shim 的系统代理探测崩溃
- 当前已升级到 `proto 0.56.0`，常规 `pnpm -C packages/i18n typecheck` 恢复可用
