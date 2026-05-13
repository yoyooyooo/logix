# Kernel Performance Evidence Lock Perf Artifacts

This directory is the local-only home for evidence generated after applying the patch.

Expected files:

```text
manifest.<sha>.<env>.default.json
report.<sha>.<env>.default.md
report.<sha>.<env>.default.json
```

Optional files:

```text
before.<sha>.<env>.default.json
after.<sha>.<env>.default.json
diff.<before>__<after>.<env>.default.json
manifest.<sha>.<env>.soak.json
report.<sha>.<env>.soak.md
report.<sha>.<env>.soak.json
```

Do not commit large raw browser artifacts unless repo policy allows them. If artifacts are external, put stable evidence refs in the manifest and keep this README as the routing contract.
