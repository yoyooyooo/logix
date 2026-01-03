# Migration Notes: Logix Router Bridge

## 当前结论

- 本特性为新增能力，预期不引入 breaking changes。

## 若实现期出现 breaking（forward-only）

一旦出现对外行为/协议的破坏性变更（例如 TraitLifecycle 事件化协议、Router Contract 字段语义），迁移说明必须写在这里，并同步更新：

- `apps/docs` 对应用户文档（不出现 PoC/v3 术语）
- `examples/*` 示例与测试夹具
- `specs/071-logix-router-bridge/quickstart.md`

