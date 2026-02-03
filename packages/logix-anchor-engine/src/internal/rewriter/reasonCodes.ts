export const ReasonCodes = {
  // Planning / eligibility
  plannedWrite: 'rewriter.planned.write',
  plannedSkip: 'rewriter.planned.skip',
  plannedFail: 'rewriter.planned.fail',

  // Safety checks
  fileNotFound: 'rewriter.file.not_found',
  expectedDigestMissing: 'rewriter.file.expected_digest_missing',
  fileChangedSincePlan: 'rewriter.file.changed_since_plan',
  targetObjectNotFound: 'rewriter.target.object_not_found',
  targetObjectAmbiguous: 'rewriter.target.object_ambiguous',
  targetObjectHasSpread: 'rewriter.target.object_has_spread',
  propertyAlreadyDeclared: 'rewriter.property.already_declared',

  // Apply failures
  applyFailed: 'rewriter.apply.failed',
} as const

