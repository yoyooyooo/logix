# Research Notes: 066 logix-galaxy 项目管理与 RBAC（成员/角色/权限/成员组）

**Feature**: `specs/066-galaxy-project-rbac/spec.md`  
**Date**: 2025-12-31

本文件用于固化 `spec.md` 中 `AUTO` clarifications 的关键裁决与取舍，降低实现阶段漂移风险。

## Decisions

### 1) 名称唯一性（Project / 成员组）

- **Decision**: Project 名称在“同一创建者”范围内以 `lower(trim(name))` 唯一；成员组名称在“同一项目”范围内以 `lower(trim(name))` 唯一。
- **Rationale**: 避免同一用户创建多个“看起来一样”的项目/组（仅大小写或空白不同），同时允许不同用户拥有同名项目。
- **Implications**:
  - `POST /projects` 与 `POST /projects/:id/groups` 需要返回 `409 ConflictError`。
  - DB 通过表达式唯一索引强制（见 `data-model.md`）。
- **Alternatives considered**:
  - 全局唯一（过强，不利于协作场景与 demo）
  - 仅大小写不敏感、不 trim（会引入“空白漂移”导致难以解释的重复）

### 2) 权限能力 key 与角色映射（最小 RBAC）

- **Decision**: 引入稳定的 `permissionKey` 集合，并固定角色→权限映射（逐级超集）：
  - `viewer` → `project.read`、`member.read`
  - `member` → `viewer` ∪ `group.read`
  - `admin` → `member` ∪ `member.manage`、`group.manage`、`audit.read`
  - `owner` → `admin` ∪ `project.update`、`owner.manage`
- **Rationale**: 既能支撑前端路由裁剪与能力开关，也能保证后端授权逻辑可测试且可扩展（未来可以在不破坏 key 的前提下追加能力）。
- **Implications**:
  - API 响应需返回 `effectivePermissionKeys`，前端只能用于体验层裁剪，后端仍是安全边界。
  - 角色变更与 owner 相关操作需要额外权限门槛（见下一节）。
- **Alternatives considered**:
  - 不暴露权限 key，仅暴露 role（前端无法稳定裁剪，且权限演进缺少“最小锚点”）
  - 直接做“权限表 + 自定义编辑器”（超出本期范围，且会拖慢联调闭环）

### 3) Owner 变更与所有权转移

- **Decision**: 仅具备 `owner.manage` 的成员可以授予/撤销 `owner`；其它角色尝试进行 owner 相关变更统一 `403`。
- **Decision**: 支持所有权转移（先提升另一成员为 owner，再移除/降级自己），但系统不得进入“无 Owner”状态（违反返回 `409`）。
- **Rationale**: 避免项目所有权被非预期夺取，同时保证管理员可以完成可控的所有权交接。

### 4) 添加项目成员的输入标识

- **Decision**: 添加项目成员使用 email（case-insensitive + trim）定位用户；用户不存在返回 `404 NotFoundError`。
- **Rationale**: 便于联调（前端/CLI 更容易输入），同时避免暴露“用户 id 列表”作为前置依赖。
- **Alternatives considered**:
  - 只支持 userId（会增加“先查用户列表/搜索”的前置交互成本）

### 5) 成员组数据不越权

- **Decision**: 不允许把“未加入项目的用户”直接加入成员组；用户必须先成为项目成员，否则加入组返回 `409 ConflictError`。
- **Rationale**: 成员组是“批量授权”的治理单元，必须建立在项目成员关系之上，避免通过组侧写入绕过成员治理。

### 6) 认证/授权口径（401/403）

- **Decision**: 未登录/会话无效统一 `401 UnauthorizedError`；已登录但权限不足统一 `403 ForbiddenError`（包含：不是项目成员、或角色不足）。
- **Rationale**: 对前端路由守卫与错误展示更稳定，且避免泄露项目存在性信息。

### 7) 确定性输出（稳定排序）

- **Decision**: `effectiveRoleKeys` 按固定优先级排序（viewer < member < admin < owner）；`effectivePermissionKeys` 按字典序升序排序。
- **Rationale**: 保证测试、diff 与缓存策略稳定，避免由于 DB 返回顺序导致的偶发差异。

### 8) 幂等与冲突（重复添加）

- **Decision**: “重复添加成员/重复加入成员组”统一返回 `409 ConflictError`，不做 silent no-op。
- **Rationale**: 对调用方更可解释，且与 DB 的唯一约束自然对齐。

## Artifacts

- Spec（WHAT/WHY）：`specs/066-galaxy-project-rbac/spec.md`
- Data model（DDL/索引/约束）：`specs/066-galaxy-project-rbac/data-model.md`
- OpenAPI（对外契约）：`specs/066-galaxy-project-rbac/contracts/openapi.yaml`
- Quickstart（验收路径）：`specs/066-galaxy-project-rbac/quickstart.md`

