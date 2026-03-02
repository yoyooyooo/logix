import path from 'node:path'

const repoRoot = path.resolve(__dirname, '../../../..')

export const EXAMPLE_ENTRY_DIRTY_FORM = `${path.resolve(
  repoRoot,
  'examples/logix/src/scenarios/and-update-on-action.ts',
)}#DirtyFormModule`

export const EXAMPLE_ENTRY_APPROVAL = `${path.resolve(repoRoot, 'examples/logix/src/scenarios/approval-flow.ts')}#ApprovalModule`

export const FIXTURE_ENTRY_MISSING_SERVICE = `${path.resolve(
  repoRoot,
  'packages/logix-cli/test/fixtures/trialrun/missing-service.entry.ts',
)}#MissingServiceModule`
