import { Schema } from "effect"

// 1. 定义 Schema
export const RegionSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  code: Schema.String
})

// 2. 导出派生类型
export type Region = Schema.Schema.Type<typeof RegionSchema>

export interface CascadeState {
  provinceId: string | null
  cityId: string | null
  districtId: string | null
}

export class ApiError {
  readonly _tag = "ApiError"

  constructor(
    readonly status: number,
    readonly message: string
  ) {}
}

