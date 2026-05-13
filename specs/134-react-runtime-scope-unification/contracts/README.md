# Contracts: React Runtime Scope Unification

本 spec 不新增 HTTP / RPC 契约。
这里记录的是 React host projection 的公开合同与禁止项。

## Public Contract

### Canonical

```tsx
const AppRuntime = Logix.Runtime.make(AppProgram)

function App() {
  return <RuntimeProvider runtime={AppRuntime}>{/* ... */}</RuntimeProvider>
}

function GlobalCounter() {
  const counter = useModule(Counter.tag)
  const count = useModule(counter, (s) => s.count)
  return <button>{count}</button>
}

function LocalEditor() {
  const editor = useModule(EditorProgram, { key: 'editor:42' })
  const draft = useModule(editor, (s) => s.draft)
  return <form>{draft}</form>
}

function ChildPanel() {
  const host = useModule(PageProgram, { key: 'page:42' })
  const detail = host.imports.get(Detail.tag)
  return <div>{useModule(detail, (s) => s.id)}</div>
}
```

## Core Rules

- `RuntimeProvider` 只提供 runtime scope 与 host projection
- `Program` 是装配蓝图
- `ModuleRuntime` 是真实实例
- `ModuleTag` 只解析当前 scope 下唯一绑定
- `useModule(ModuleTag)` 做 lookup
- `useModule(Program)` 做 instantiate
- `host.imports.get(ModuleTag)` 做 parent-scope child resolution
- `useImportedModule(parent, tag)` 只是 `host.imports.get(tag)` 的 hook 形态

## Forbidden Shapes

- canonical 文档继续推荐 `useModule(Module)`
- `ModuleTag` 被当成同模块多 `Program` 的选择器
- `useImportedModule` 被当成 root 查找器、Program 选择器或跨 scope 搜索器
- 同一 parent scope imports 两个来自同一 `Module` 的 child `Program`
- React 本地实例缓存只用 `moduleId + key`
- `RuntimeProvider` 被写成业务装配层或第二 control plane
