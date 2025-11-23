---
title: 04 · 从意图到代码：v3 演练 (Example)
status: draft
version: 1
---

> 本文档通过一个“用户注册”的例子，展示在三位一体模型下，意图是如何从 PM 的 Spec 显影为 Dev 的 Impl 的。

## 场景：用户注册 (User Registration)

### 1. Domain Intent (记忆)

**PM Spec (Concept)**:
> “我们需要存储用户，包含手机号和密码。”

**Dev Impl (Schema)**:
```typescript
// Domain Intent Node: User
{
  id: 'domain:user',
  impl: {
    name: 'User',
    fields: [
      { name: 'phone', type: 'string', validation: 'phone_cn' },
      { name: 'password', type: 'string', validation: 'min:8' }
    ]
  }
}
```

### 2. UI Intent (躯壳)

**PM Spec (Wireframe)**:
> “一个居中的卡片，里面有手机号输入框、密码框和注册按钮。”

**Dev Impl (Component Tree)**:
```typescript
// UI Intent Node: RegisterPage
{
  id: 'ui:register-page',
  impl: {
    component: 'CenterLayout',
    slots: {
      content: {
        component: 'FormPattern',
        props: {
          fields: ['phone', 'password'],
          submitText: '注册'
        },
        emits: {
          onSubmit: 'signal:submit-register' // 绑定信号
        }
      }
    }
  }
}
```

### 3. Logic Intent (灵魂)

**PM Spec (User Story)**:
> “用户点击注册后，先校验手机号是否已存在。如果存在提示错误，否则创建用户并跳转登录页。”

**Dev Impl (Flow DSL)**:
```typescript
// Logic Intent Node: RegisterFlow
{
  id: 'logic:register-flow',
  impl: {
    trigger: { signalId: 'signal:submit-register' },
    flow: {
      nodes: {
        check: { 
          type: 'service-call', 
          service: 'User.checkExists', 
          args: { phone: '$payload.phone' }
        },
        branch: {
          type: 'branch',
          condition: '$check.exists'
        },
        error: {
          type: 'update-state',
          path: 'ui.error',
          value: '手机号已存在'
        },
        create: {
          type: 'service-call',
          service: 'User.create',
          args: '$payload'
        },
        nav: {
          type: 'emit-signal',
          signalId: 'navigate:login'
        }
      },
      edges: [
        { from: 'check', to: 'branch' },
        { from: 'branch', to: 'error', when: true },
        { from: 'branch', to: 'create', when: false },
        { from: 'create', to: 'nav' }
      ]
    }
  }
}
```

## 4. 结晶产物 (Code Generation)

平台根据上述 Impl 自动生成代码：

*   `src/domain/user.ts` (Zod Schema)
*   `src/pages/RegisterPage.tsx` (React Component)
*   `src/flows/register.flow.ts` (Effect Program)
