# Layer Code Map

| Layer | Code Roots | Owner | Chain |
| --- | --- | --- | --- |
| surface / authoring | `packages/logix-core/src/*.ts`, `packages/logix-form/**`, `packages/logix-query/**`, `packages/i18n/**`, `packages/domain/**` | `122`, `125`, `127` | implementation |
| field-kernel | `packages/logix-core/src/internal/state-field/**`, `packages/logix-form/**` | `125` | implementation |
| runtime core | `packages/logix-core/src/internal/runtime/core/**` | `123` | implementation |
| runtime control plane | `packages/logix-core/src/internal/evidence-api.ts`, `packages/logix-core/src/internal/reflection-api.ts`, `packages/logix-cli/**`, `packages/logix-sandbox/**`, `packages/logix-test/**` | `124` | governance |
| UI projection | `packages/logix-react/**`, `examples/logix-react/**` | `126` | host projection |
