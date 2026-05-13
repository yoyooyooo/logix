# Sequencing

## Required Order

```text
212 group anchor
213 preflight ledger
214 selector dirty/read fanout sentinels
215 RuntimeStore listener/callback fast path
216 readQuery external-store runSync fallback sentinels
217 topic retain/release lifecycle cleanup
218 React useSelector render fanout sentinels
219 focused evidence gate
220 selector notify tax migration report gate
```

## Reason

Do not optimize before ledger. Do not claim evidence before classifier. Do not touch React fanout before core selector/RuntimeStore sentinels exist.

## PR Guidance

One spec-sized PR at a time. Update each spec `handoff.md` before moving on.
