# Lifecycle Wiring Ledger: I18n Logic Contract Cutover

## Shared Wiring Path

- driver `initialized` event -> service snapshot transition to `ready`
- driver `languageChanged` event -> service snapshot language update
- `changeLanguage(...)` -> service-level effect with pending -> ready or failed transition

## Consumption Rule

- canonical consumption stays on `services.i18n`
- consumers read `snapshot`, `t`, `tReady`, `token`
- driver lifecycle details do not become a second package-level authoring surface
