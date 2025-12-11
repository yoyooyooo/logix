---
title: 矩阵验收详情页复杂逻辑的 Logix 支撑方案分析
status: draft
version: 2025-12-02 (Refined)
priority: 100
related: []
---

# 矩阵验收详情页复杂逻辑的 Logix 支撑方案分析

## 1. 背景与痛点分析

基于 `FORM_PAINPOINTS.md` 的梳理，该模块（矩阵验收详情页）的核心复杂性在于**“隐式依赖”**与**“逻辑分散”**，导致维护成本高、可测试性差。

### 1.1 核心痛点

1.  **字段依赖关系隐式化、跨层级**
    *   **现象**：修改一个字段（如“验收人”），通过 Event Handler 触发一连串副作用（查国家 -> 改组织 -> 改主体 -> 清空/回填矩阵明细）。
    *   **问题**：依赖关系“长在代码里”，无法通过 Schema 或配置直观看到。新增字段时容易漏掉清空/回填逻辑。
2.  **校验规则碎片化**
    *   **现象**：校验逻辑散落在 Form Item 属性、Footer 提交函数、以及自定义 Hook（如 `useShouldCheckUniqueInvoice`）中。
    *   **问题**：无法一眼看清“提交前到底要满足哪些条件”。规则与配置强绑定，但配置来源隐蔽。
3.  **动态选项与环境依赖混乱**
    *   **现象**：下拉选项依赖多个维度（国家、组织），这些维度在不同组件中被重复计算。选项刷新机制不统一（有的挂载时查，有的依赖变动查）。
    *   **问题**：选项来源不清晰，环境上下文（Context）传递混乱。

### 1.2 现状编排模式分析

当前代码主要采用 **“UI 组件驱动 + 散乱 Hooks”** 的编排模式，具体表现为：

1.  **基于 Event Handler 的命令式编排**
    *   业务流程被拆解为一系列分散的 Event Handler。
    *   **示例**：“修改验收人”这一动作，实际上是由 `handleChangeReceiptUser` (BasicInfo) -> `handleOrgCountryChange` (BasicInfo) -> `handlePaymentOrgChange` (BasicInfo) -> `APIGetSupplierTaxNo` (Service) 这一条隐式的调用链组成的。
    *   **后果**：阅读代码时必须手动追踪函数调用栈，无法直观看到完整的业务流程。

2.  **逻辑碎片化分布**
    *   同一个业务规则的实现往往跨越多个文件层级。
    *   **示例**：“发票三要素唯一性校验”逻辑：
        *   **配置层**：在 `hooks/useShouldCheckUniqueInvoice.tsx` 中获取“需要校验的主体列表”。
        *   **触发层**：在 `components/Footer.tsx` 的提交函数中判断“当前主体是否在列表中”。
        *   **执行层**：在 `components/Footer.tsx` 中遍历矩阵数据进行查重。
        *   **表现层**：在 `MatrixTable` 的单元格中控制必填样式。
    *   **后果**：修改一个规则需要同时维护 3-4 个文件，极易漏改。

3.  **数据流与副作用混合**
    *   数据获取（Query）与副作用（Side Effect）耦合在组件渲染或 Handler 中。
    *   **示例**：下拉选项的获取逻辑（`useQuery`）直接写在组件体内，且依赖项（如 `currentCountry`）在多个组件中重复计算，导致“选项刷新”与“字段变更”的时序难以预测。

### 1.3 为什么难维护

*   **缺乏统一视图**：没有一个地方能完整描述“这个表单的行为”。
*   **副作用难以追踪**：Handler 模式导致副作用满天飞，很难预测改一个字段会影响哪里。
*   **测试困难**：逻辑与 UI 组件强耦合，难以进行纯逻辑单元测试。

---

## 2. Logix 详细实现范式

本节展示如何使用 Logix 将上述分散的逻辑重构为内聚的模块。

### 2.1 定义模块与响应式状态 (Module & Reactive Schema)

首先定义模块结构，将字段依赖和动态选项下沉到 Schema 定义中。利用 `Reactive.computed` 和 `Reactive.async` 显式声明数据依赖。

```typescript
// 1. 定义 Schema
const MatrixRowSchema = Schema.Struct({
  id: Schema.String,
  stationCode: Schema.String,
  deptId: Schema.String,
  feeType: Schema.String,
  invoiceNo: Schema.String,
  invoiceSerial: Schema.String,
  chaveKey: Schema.String,
  // ...其他字段
})

const MatrixStateSchema = Schema.Struct({
  // 基础字段 (Source of Truth)
  receiptUserCode: Schema.String,
  applicationOrgId: Schema.String,
  paymentOrgId: Schema.String,
  departmentId: Schema.String, // 新增：部门ID
  batchReceiptDetailDTOList: Schema.Array(MatrixRowSchema),

  // 派生字段 / 异步资源只在这里声明形状，不直接写逻辑
  // currentCountry / accountingUnit 等字段由 Module.reactive 负责维护
  currentCountry: Schema.String,
  accountingUnit: Schema.String,

  // 选项列表通常是「可加载资源」，这里用 Any 占位，实际实现可以用 Schema.Loadable 等容器
  expenseItemOptions: Schema.Any,
  vendorOptions: Schema.Any,
})

// 2. 定义 Module（用 Module.reactive 承载 Reactive / Query 逻辑）
export const MatrixAcceptanceModule = Logix.Module.make('MatrixAcceptance', {
  state: MatrixStateSchema,
  actions: {
    'user/change': Schema.String, // 修改验收人
    'department/change': Schema.String, // 修改部门
    'submit': Schema.Void
  },

  reactive: {
    // 计算字段 (Computed Fields) - 解决隐式依赖
    // 示例：当前国家总是由申请组织决定
    currentCountry: Reactive.computed((s) => {
      const org = findOrgById(s.applicationOrgId)
      return org?.country || ''
    }),

    // 示例：核算单元依赖于部门和国家
    accountingUnit: Reactive.computed((s) => {
      if (!s.departmentId) return ''
      // 假设这里有复杂的计算逻辑
      return calculateAccountingUnit(s.departmentId, s.currentCountry) ?? ''
    }),

    // 异步资源 (Async Resources) - 解决动态选项混乱
    // 示例：费用类型选项依赖于国家，自动响应 currentCountry 变化
    expenseItemOptions: Reactive.async(async (get) => {
      const country = get('currentCountry')
      if (!country) return []
      return await fetchExpenseItems(country)
    }),

    // 示例：供应商选项依赖于网点
    vendorOptions: Reactive.async(async (get) => {
      const station = get('stationCode') // 假设 state 中有 stationCode
      if (!station) return []
      return await fetchVendors(station)
    }),
  },
})
```

### 2.2 封装业务流 (Logic Flow)

使用 `Module.logic` 定义独立的业务逻辑单元。

#### 场景 A: 修改验收人 (级联更新)

将“修改验收人 -> 查国家 -> 改组织 -> 改主体 -> 清空明细”这一长链条封装为一个原子 Logic。

```typescript
// 定义内部复用的 Effect (非 Logic，仅作为原子能力)
const clearMatrixFields = ($: any) => Effect.gen(function* () {
  yield* $.state.update(s => {
    const newList = s.batchReceiptDetailDTOList.map(item => ({
      ...item,
      stationCode: '',
      deptId: '',
      feeType: ''
    }))
    return { ...s, batchReceiptDetailDTOList: newList }
  })
})

// 定义修改验收人 Logic
const ChangeReceiptUserLogic = MatrixAcceptanceModule.logic(($) =>
  Effect.gen(function* () {
    // 监听 'user/change' Action
    yield* $.onAction('user/change').run(function* (userCode) {
      // 1. 获取用户国家 (API 调用)
      const country = yield* APIGetOptionsUserCountry({ userCode })
      if (!country) return

      // 2. 计算关联字段 (纯逻辑)
      const org = findOrgByCountry(country)
      const entity = findEntityByCountry(country)

      // 3. 原子更新状态
      yield* $.state.update(s => ({
        ...s,
        receiptUserCode: userCode,
        applicationOrgId: org?.value,
        paymentOrgId: entity?.value
      }))

      // 4. 执行副作用 (清空明细)
      yield* clearMatrixFields($)
    })
  })
)
```

#### 场景 B: 修改部门 (复杂联动)

假设修改部门会影响核算单元，并且如果部门不在 HRMS 树上，需要置空。

```typescript
const ChangeDepartmentLogic = MatrixAcceptanceModule.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction('department/change').run(function* (deptId) {
      // 1. 校验部门有效性
      const isValid = yield* CheckDepartmentValid(deptId)

      yield* $.state.update(s => {
          const updates: any = { departmentId: deptId }

          // 2. 根据规则重置核算单元 (虽然 Schema 中有 computed，但有时需要显式重置 override)
          if (!isValid) {
              updates.accountingUnit = null
          }

          return { ...s, ...updates }
      })
    })
  })
)
```

### 2.3 统一校验 (Unified Validation)

将校验逻辑封装在 `SubmitLogic` 中，作为提交流程的一部分。

```typescript
// 校验 Effect
const ValidateInvoiceLogic = MatrixAcceptanceModule.logic(($) =>
  Effect.gen(function* () {
    const { paymentOrgId, batchReceiptDetailDTOList } = yield* $.state.read

    // 1. 获取动态配置 (是否需要校验)
    const config = yield* APIGetOptionsValue(['invoicePaymentOrgIdList'])
    const shouldCheck = config.includes(paymentOrgId)

    if (!shouldCheck) return true

    // 2. 执行核心校验逻辑
    const errors = []
    const map = new Map()

    batchReceiptDetailDTOList.forEach((row, index) => {
      const combo = `${row.invoiceNo}-${row.invoiceSerial}-${row.chaveKey}`
      if (map.has(combo)) {
        errors.push({ index, message: '发票三要素重复' })
      }
      map.set(combo, true)
    })

    // 3. 统一抛出错误 (UI 层通过 lifecycle.onError 捕获并展示)
    if (errors.length > 0) {
      yield* $.lifecycle.notifyError({ type: 'Validation', errors })
      return false
    }
    return true
  })
)

// 提交 Logic
const SubmitLogic = MatrixAcceptanceModule.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction('submit').run(function* () {
      // 编排校验与提交
      const isValid = yield* ValidateInvoiceLogic($) // 注意：这里假设 ValidateInvoiceLogic 暴露了 invoke 方法或作为普通 Effect 复用
      if (!isValid) return

      // yield* submitData($)
    })
  })
)
```

### 2.4 模块组装 (Module Implementation)

最后，在 `Module.implement` 中装载这些 Logic。

```typescript
export const MatrixAcceptanceImpl = MatrixAcceptanceModule.implement({
  initial: {
    receiptUserCode: '',
    applicationOrgId: '',
    paymentOrgId: '',
    departmentId: '',
    batchReceiptDetailDTOList: [],
    // ...
  },
  logics: [
    ChangeReceiptUserLogic,
    ChangeDepartmentLogic,
    SubmitLogic
  ]
})
```

---

## 3. UI 集成 (UI Integration)

在 React 层，我们不再手动管理 State 和 Effect，而是直接消费 Module。

### 3.1 接入 Module

```tsx
// pages/MatrixAcceptance/index.tsx
import { useModule } from '@logix/react'
import { MatrixAcceptanceImpl } from './model'

export const MatrixAcceptancePage = () => {
  // 1. 初始化模块
  const { state, actions } = useModule(MatrixAcceptanceImpl)

  // 2. 消费响应式数据 (自动解包 Reactive.async)
  const { expenseItemOptions } = state

  return (
    <Form>
      <BasicInfoSection
        state={state}
        onChangeUser={(val) => actions['user/change'](val)}
      />

      <MatrixTable
        data={state.batchReceiptDetailDTOList}
        expenseOptions={expenseItemOptions.value} // 直接使用 Async 数据
        loading={expenseItemOptions.loading}
      />

      <Footer onSave={() => actions['submit']()} />
    </Form>
  )
}
```

### 3.2 优势

1.  **UI 纯粹化**：组件只负责渲染 `state` 和触发 `actions`，不再包含 `useEffect` 或复杂的 `handleXxx` 逻辑。
2.  **类型安全**：`state` 和 `actions` 均由 Schema 自动推导，重构时有 TS 报错保障。
3.  **性能优化**：Logix 内部通过细粒度订阅管理渲染更新，避免 Context 导致的整树重绘。

---

## 4. 迁移策略 (Migration Strategy)

考虑到该页面逻辑复杂，建议采用 **"绞杀者模式" (Strangler Fig Pattern)** 分步迁移。

### Phase 1: 状态接管 (State Takeover)
*   **目标**：引入 Logix Module 作为 State Holder，但保留现有的 Event Handlers。
*   **做法**：
    1.  创建 `MatrixAcceptanceModule`，定义完整的 State Schema。
    2.  在 React 组件中 `useModule`。
    3.  将原有的 `useState` 替换为 `module.state`。
    4.  在现有的 `handleXxx` 中调用 `module.state.update` 更新数据。
*   **收益**：统一了状态源，解决了 Context 传递混乱的问题。

### Phase 2: 逻辑下沉 (Logic Sinking)
*   **目标**：将 Event Handlers 中的业务逻辑逐步移动到 `Module.logic`。
*   **做法**：
    1.  挑选一个复杂的 Handler（如 `handleChangeReceiptUser`）。
    2.  在 Module 中定义对应的 Action (`user/change`) 和 Logic。
    3.  将 Handler 内容重构为 Effect 代码。
    4.  在 UI 中将 Handler 替换为 `actions['user/change']`。
*   **收益**：逻辑开始内聚，副作用可追踪。

### Phase 3: 响应式重构 (Reactive Refactoring)
*   **目标**：利用 `Module.reactive`（内部基于 `Reactive.computed` / `Reactive.async` 等）消除手动维护的副作用。
*   **做法**：
    1.  识别 `useEffect` 中用于同步数据的代码（如 `useEffect(() => fetchOptions(country), [country])`）。
    2.  将其迁移为 Module 定义中的 `reactive` 配置（例如 `expenseItemOptions: Reactive.async(...)`）。
    3.  删除对应的 `useEffect`。
*   **收益**：代码量大幅减少，逻辑完全声明式。

## 5. 总结

使用 Logix 重构该模块的核心价值在于：**将“隐式、分散的 UI 逻辑”转化为“显式、集中的领域逻辑”**。

*   **Before**: 逻辑散落在 Handler、Hook、Render 中，靠脑补拼凑。
*   **After**: 逻辑沉淀在 Schema (依赖关系)、Flow (业务流程)、Module (整体封装) 中，代码即文档。
