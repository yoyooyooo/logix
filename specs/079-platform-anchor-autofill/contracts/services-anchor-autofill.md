# Contract: services 锚点补全（ModuleDef.services）

## 目标

在满足“高置信度”前提下，为未声明 `services` 的 Module 自动补齐输入服务依赖声明：

- 默认 `port = serviceId`
- 不推断业务别名
- 任何不确定都跳过

## 高置信度判定（必须全部满足）

1. Module 定义点可定位且可安全改写（对象字面量；无 spread；无二次封装）。
2. Module 未显式声明 `services`（字段缺失）；`services: {}` 视为已声明。
3. 能从 Platform-Grade 子集中识别到确定的 `$.use(ServiceTag)` 使用点。
4. 能从 ServiceTag 的定义中解析出稳定 `serviceId`（权威规则见 `specs/078-module-service-manifest/contracts/service-id.md`；本特性静态解析仅覆盖 `Context.Tag("...")` 的字符串字面量子集）。

## 写回形态（示意）

```ts
Logix.Module.make('X', {
  // ...
  services: {
    'svc/archive': ArchiveServiceTag,
    'svc/backup': BackupServiceTag,
  },
})
```

约束：

- keys 必须按 `serviceId` 稳定排序。
- 同一 `serviceId` 不得重复；冲突则跳过并报告 `dynamic_or_ambiguous_usage` 或更具体 code。
