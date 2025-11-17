import orderExport from './order-export.usecase.json'
import opsWorkbench from './ops-workbench.usecase.json'

export const requirementCases = [orderExport, opsWorkbench]

export type RequirementCase = (typeof requirementCases)[number]
export type RequirementId = RequirementCase['id']
