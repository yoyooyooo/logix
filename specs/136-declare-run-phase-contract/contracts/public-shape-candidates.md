# Public Shape Candidates: Declare Run Phase Contract

## Candidate A

```ts
Module.logic(id, ($) => {
  // declaration
  return runEffect
})
```

优点：

- 单一 builder
- declaration 与 run 的边界最短
- 不再显式抬高第二个 phase object

结论：

- 作为当前首选方向继续推进

## Candidate B

```ts
Module.logic(id, ($) => ({
  declare() {},
  run: runEffect,
}))
```

问题：

- 仍显式保留第二个 phase object
- 会把语法对象重新抬成公开心智

结论：

- 不作为 canonical public shape

## Candidate C

```ts
Module.logic(id, ($) => ({
  setup: ...,
  run: ...,
}))
```

问题：

- 继续继承旧相位对象
- 与 declaration or run 语义收口目标冲突

结论：

- 只允许继续停在 internal compatibility zone
