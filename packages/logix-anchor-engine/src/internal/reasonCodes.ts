export const ReasonCodes = {
  moduleMakeNonLiteralModuleId: 'module_make.non_literal_module_id',
  moduleMakeMissingDef: 'module_make.missing_def',
  moduleMakeDefNotObjectLiteral: 'module_make.def_not_object_literal',

  moduleDevNotObjectLiteral: 'module_dev.def_not_object_literal',

  serviceUseMissingArg: 'service_use.missing_arg',
  serviceUseUnresolvedSymbol: 'service_use.unresolved_symbol',
  serviceUseUnresolvableServiceId: 'service_use.unresolvable_service_id',
  serviceUseAmbiguousServiceId: 'service_use.ambiguous_service_id',

  workflowMakeMissingDef: 'workflow_make.missing_def',
  workflowMakeDefNotObjectLiteral: 'workflow_make.def_not_object_literal',
  workflowDefMissingLocalId: 'workflow_def.missing_local_id',
  workflowDefDuplicateStepKey: 'workflow_def.duplicate_step_key',

  workflowStepArgsNotObjectLiteral: 'workflow_step.args_not_object_literal',
  workflowStepDuplicateStepKey: 'workflow_step.duplicate_step_key',
  workflowCallNonLiteralServiceId: 'workflow_call.non_literal_service_id',
} as const

export type ReasonCode = (typeof ReasonCodes)[keyof typeof ReasonCodes]
