# Logix docs app (`apps/docs`)

`apps/docs` is the user-facing Logix documentation site. It is built with Next.js and Fumadocs.

The site teaches the current public route:

```text
Module.logic(...) -> Program.make(...) -> Runtime.make(...)
RuntimeProvider -> useModule(...) -> useSelector(...)
```

Internal implementation language such as traits, field-kernel, compiler assets, runtime stores, and verification internals should not become the main user narrative. Those terms may appear only when a page explicitly explains why users do not normally need them.

## Content structure

```text
content/docs/
  index.mdx                 site-level docs entry
  guide/
    get-started/            introduction, quick start, tutorials
    essentials/             canonical concepts every user should keep stable
    patterns/               concrete application patterns
    advanced/               runtime policies and expert topics
  api/
    core/                   Module, Program, Runtime, Bound API, Handle
    react/                  RuntimeProvider, useModule, useSelector, dispatch/imports
    reference.md            generated signature reference entry
  form/                     Form domain DSL and React read route
  faq.md
```

`guide/learn` and `guide/recipes` are intentionally absent from the current IA. Tutorial material belongs in `guide/get-started`; reusable application shapes belong in `guide/patterns`; runtime policy material belongs in `guide/advanced`.

## Local development

```bash
pnpm install
pnpm dev
```

Default local route: `http://localhost:3000`.

## Internationalization

The default language is English. Chinese pages use the `.cn` suffix:

```text
content/docs/index.mdx
content/docs/index.cn.mdx
content/docs/guide/get-started/quick-start.md
content/docs/guide/get-started/quick-start.cn.md
```

Fumadocs `meta.json` files define navigation order. Keep English and Chinese page pairs aligned.

## Writing rules

User pages should read like product documentation, not a training outline.

Prefer:

- direct concepts;
- code before commentary;
- current public API names;
- one canonical route before alternatives;
- explicit owner boundaries.

Avoid generic headings such as “Who this is for”, “Prerequisites”, “You will learn”, “适合谁”, “前置知识”, or “读完你将获得”. If a requirement matters, put it in the prose where the reader needs it.

## Source alignment

When Logix API shape changes, update these docs from the current source and SSoT:

- `@logixjs/core`: Module, Program, Runtime, Bound API, verification reports;
- `@logixjs/react`: RuntimeProvider, useModule, useSelector, useDispatch, useImportedModule;
- `@logixjs/form`: Form.make, Rule, Error, Companion, source, field arrays, submit.

Generated API reference remains the signature dictionary. Hand-written pages should explain usage, boundaries, and stable mental model.

## Landing page constraints

- Use design tokens; do not hard-code colors.
- Use `src/components/ui/*` for base UI pieces.
- Avoid backdrop blur/filter and glow-style shadows.
- Use Framer Motion only where it preserves reduced-motion behavior.
