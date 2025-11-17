export interface Todo {
  readonly id: number
  readonly title: string
  readonly completed: boolean
  readonly createdAt: string
}

export interface TodoCreateInput {
  readonly title: string
  readonly completed?: boolean
}

export interface TodoUpdateInput {
  readonly title?: string
  readonly completed?: boolean
}
