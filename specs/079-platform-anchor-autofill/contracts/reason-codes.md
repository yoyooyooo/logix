# Contract: Reason Codes（跳过/降级的可解释枚举）

## 目标

reason codes 用于把“不确定性”显式化，避免工具暗自猜测导致 IR 漂移。

## 枚举（v1）

### 通用

- `already_declared`：目标对象已显式声明该锚点（含 `services: {}`）。
- `unsafe_to_patch`：定义形态不可安全改写（非对象字面量 / 包含 spread / 语义不确定）。
- `unsupported_shape`：暂不支持的代码形态（需迁移到 Platform-Grade 子集）。

### services 补全

- `no_confident_usage`：未发现可确定的服务使用点（或全部降级为黑盒）。
- `dynamic_or_ambiguous_usage`：服务使用点存在动态表达式/多候选/不可解析中转。
- `unresolvable_service_id`：无法推导稳定 `serviceId`（不满足补全前提）。

### dev.source 补全

- `missing_location`：无法获得可靠的定位信息（极少见；通常为工具链输入问题）。

## 约束

- 每个 code 必须有可行动的 message（指导作者如何显式声明/如何迁移写法）。
- codes 的新增/改名属于 breaking：需要迁移说明（forward-only）。

