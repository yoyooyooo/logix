---
title: Logix 对复杂动态列表表单 (Array List) 的支撑方案
status: draft
version: 2025-12-02T00:00:00.000Z
priority: 300
---

# Logix 对复杂动态列表表单 (Array List) 的支撑方案

## 1. 场景与需求

针对用户提出的“教育经历”、“其他证书”等场景，核心需求包括：

1.  **动态列表 (Dynamic List)**: 类似 `useFieldArray`，支持增删改查。
2.  **字段联动 (Field Linkage)**: 列表项内部字段联动（如：学历 -> 专业是否必填）。
3.  **异步操作 (Async)**: 列表项内的文件上传、异步校验。
4.  **复杂校验 (Validation)**: 针对列表整体或单项的校验规则。

## 2. 核心设计范式

Logix 通过 `Schema.Array` 配合 `Module.logic` 完美支持此类场景。与 RHF `useFieldArray` 不同，Logix 将状态管理下沉到 Module 层，UI 层只需消费数据。

### 2.1 定义 Schema (State Shape)

使用 `Schema.Array` 定义列表结构。

```typescript
// 1. 定义单项 Schema
const EducationItemSchema = Schema.Struct({
  id: Schema.String, // 唯一标识，用于 Key
  degree: Schema.String, // 学历
  schoolName: Schema.String, // 院校名称
  startDate: Schema.String, // 入学时间
  endDate: Schema.String, // 毕业时间
  major: Schema.String, // 专业
  isFullTime: Schema.Boolean, // 是否全日制
  certificate: Schema.optional(Schema.String), // 毕业证 (URL 或 ID)

  // UI 辅助状态 (可选，也可以分离)
  uploading: Schema.Boolean,
})

// 2. 定义模块 State（只描述数据形状，不直接内嵌 Reactive 逻辑）
const ResumeStateSchema = Schema.Struct({
  userId: Schema.String,
  educationList: Schema.Array(EducationItemSchema),
  certificateList: Schema.Array(CertificateItemSchema),

  // 派生字段：是否包含“博士”学历 (用于外部联动)
  // 这里仅声明形状，具体计算逻辑放在 Module.reactive 中
  hasPhD: Schema.Boolean,
})

export const ResumeModule = Logix.Module('Resume', {
  state: ResumeStateSchema,
  actions: {
    'edu/add': Schema.Void,
    'edu/remove': Schema.String, // ID
    'edu/update': Schema.Struct({ id: Schema.String, patch: Schema.Partial(EducationItemSchema) }),
    'edu/uploadCert': Schema.Struct({ id: Schema.String, file: Schema.Any }) // 触发上传
  },

  // 3. 在 Module.reactive 中集中声明派生逻辑
  reactive: {
    hasPhD: Reactive.computed((s) =>
      s.educationList.some((item) => item.degree === 'PhD'),
    ),
  },
})
```

### 2.2 列表操作 (List Actions)

通过 Logic 处理增删改逻辑。

```typescript
const EducationListLogic = ResumeModule.logic(($) =>
  Effect.gen(function* () {
    // 新增
    yield* $.onAction('edu/add').run(() =>
      $.state.update(s => ({
        ...s,
        educationList: [
          ...s.educationList,
          { id: nanoid(), degree: '', schoolName: '', ... } // 初始值
        ]
      }))
    )

    // 删除
    yield* $.onAction('edu/remove').run((id) =>
      $.state.update(s => ({
        ...s,
        educationList: s.educationList.filter(item => item.id !== id)
      }))
    )

    // 更新 (通用 Patch)
    yield* $.onAction('edu/update').run(({ id, patch }) =>
      $.state.update(s => ({
        ...s,
        educationList: s.educationList.map(item =>
          item.id === id ? { ...item, ...patch } : item
        )
      }))
    )
  })
)
```

### 2.3 异步上传与联动 (Async & Linkage)

在列表项中处理异步上传，并实现字段联动。

```typescript
const EducationAsyncLogic = ResumeModule.logic(($) =>
  Effect.gen(function* () {
    // 监听上传动作
    yield* $.onAction('edu/uploadCert').run(function* ({ id, file }) {
      // 1. 标记该项为上传中
      yield* $.state.update(s => ({
        ...s,
        educationList: s.educationList.map(item =>
          item.id === id ? { ...item, uploading: true } : item
        )
      }))

      // 2. 执行上传 (Effect)
      const result = yield* UploadService.upload(file)

      // 3. 回填结果 & 取消 Loading
      yield* $.state.update(s => ({
        ...s,
        educationList: s.educationList.map(item =>
          item.id === id ? { ...item, certificate: result.url, uploading: false } : item
        )
      }))
    })
  })
)
```

### 2.5 标准 Dynamic List Pattern：ListLogic 草案

上面的增删改实现本质上是「列表样板代码」，在不同业务中高度相似。可以通过 Pattern 形式沉淀一个通用的 Dynamic List Logic：

```ts
// 草案 API：为指定列表字段生成标准增删改 Logic
const EducationListLogic = Logix.Pattern.dynamicList({
  module: ResumeModule,
  // 指定列表在 State 中的位置
  path: (s: Schema.Type<typeof ResumeStateSchema>) => s.educationList,
  // 用于识别列表项的主键字段
  key: (item: Schema.Type<typeof EducationItemSchema>) => item.id,
  // 绑定要使用的 Action 名称（也可由 Pattern 自动生成）
  actions: {
    add: 'edu/add',
    remove: 'edu/remove',
    patch: 'edu/update',
  },
  // 列表项的初始值工厂（可以依赖当前全局 state）
  makeInitialItem: (state) => ({
    id: nanoid(),
    degree: '',
    schoolName: '',
    startDate: '',
    endDate: '',
    major: '',
    isFullTime: false,
    uploading: false,
  }),
})
```

实现层面，`Logix.Pattern.dynamicList` 只是对 Fluent DSL 的封装：

- `add`：在内部展开为 `$.onAction('edu/add').update(...)`；
- `remove`：展开为 `$.onAction('edu/remove').update(...)`；
- `patch`：展开为 `$.onAction('edu/update').update(...)`。

这样 Dynamic List 的「套路」就从业务模块中剥离出来，Logix 只需要在 Pattern 层提供一个统一的入口，底层仍然完全基于当前已经标准化的 Fluent DSL 和 State Update 语义。

### 2.4 复杂校验 (Validation)

校验逻辑可以遍历数组，生成针对每一项的错误信息。

```typescript
const ValidateEducationLogic = ResumeModule.logic(($) =>
  Effect.gen(function* () {
    const { educationList } = yield* $.state.read
    const errors = []

    educationList.forEach((item, index) => {
      // 规则 1: 毕业时间必须晚于入学时间
      if (dayjs(item.endDate).isBefore(item.startDate)) {
        errors.push({ path: `educationList.${index}.endDate`, message: '毕业时间不能早于入学时间' })
      }

      // 规则 2: 联动校验 - 如果是全日制，必须上传证书
      if (item.isFullTime && !item.certificate) {
        errors.push({ path: `educationList.${index}.certificate`, message: '全日制必须上传证书' })
      }
    })

    if (errors.length > 0) {
      yield* $.lifecycle.notifyError({ type: 'Validation', errors })
      return false
    }
    return true
  })
)
```

## 3. UI 集成 (React)

在 React 中渲染列表，使用 `map` 遍历。

```tsx
const EducationSection = () => {
  const { state, actions } = useModule(ResumeImpl)

  return (
    <div>
      {state.educationList.map((item) => (
        <div key={item.id} className="card">
          {/* 字段绑定 */}
          <Select
            value={item.degree}
            onChange={val => actions['edu/update']({ id: item.id, patch: { degree: val } })}
          />

          {/* 联动展示：全日制才显示证书上传 */}
          {item.isFullTime && (
            <Upload
              loading={item.uploading}
              onFile={file => actions['edu/uploadCert']({ id: item.id, file })}
            />
          )}

          <Button onClick={() => actions['edu/remove'](item.id)}>删除</Button>
        </div>
      ))}

      <Button onClick={() => actions['edu/add']()}>添加教育经历</Button>
    </div>
  )
}
```

## 4. 总结

Logix 完全能够承载 `useFieldArray` 场景，且具有以下优势：

1.  **逻辑解耦**: 上传、校验、联动逻辑都在 Module 中，UI 极其轻量。
2.  **细粒度更新**: 配合 React Compiler 或细粒度 Selector，列表更新性能优异。
3.  **可测试性**: 可以在不挂载 React 组件的情况下，直接测试 `edu/add`、`edu/uploadCert` 的逻辑。
