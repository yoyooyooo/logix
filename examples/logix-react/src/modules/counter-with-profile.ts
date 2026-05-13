import * as Logix from '@logixjs/core'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Schema } from 'effect'

// 1) State Schema：包含原始字段 + computed 字段 + 资源字段
export const CounterStateSchema = Schema.Struct({
  a: Schema.Number,
  b: Schema.Number,
  sum: Schema.Number,
  profile: Schema.Struct({
    id: Schema.String,
    name: Schema.String,
  }),
  // profileResource：逻辑资源快照（ResourceSnapshot）
  profileResource: Schema.Struct({
    status: Schema.String,
    keyHash: Schema.optional(Schema.String),
    data: Schema.optional(
      Schema.Struct({
        name: Schema.String,
      }),
    ),
    error: Schema.optional(Schema.Any),
  }),
})

export type CounterState = Schema.Schema.Type<typeof CounterStateSchema>

// 2) Actions：这里只关注字段行为示例，保持最小集合
export const CounterActions = {
  increment: Schema.Void,
  loadProfile: Schema.String, // userId
}

// 3) Field declarations：使用 repo-internal field declarations 声明 computed / source
export const CounterFields = FieldContracts.fieldFrom(CounterStateSchema)({
  // sum 是 a + b 的派生字段
  sum: FieldContracts.fieldComputed({
    deps: ['a', 'b'],
    get: (a, b) => a + b,
  }),

  // profileResource 代表 "user/profile" 资源
  profileResource: FieldContracts.fieldSource({
    deps: ['profile.id'],
    resource: 'user/profile',
    key: (profileId) => ({ userId: profileId }),
  }),

  // profile.name 跟随 profileResource.data.name（内部字段派生）
  'profile.name': FieldContracts.fieldComputed({
    deps: ['profileResource.data.name'],
    get: (profileName) => String(profileName ?? ''),
  }),
})

// 4) Module 图纸：state + actions + field declarations
export const CounterWithProfile = Logix.Module.make('CounterWithProfile', {
  state: CounterStateSchema,
  actions: CounterActions,
})

FieldContracts.withModuleFieldDeclarations(CounterWithProfile, CounterFields)
