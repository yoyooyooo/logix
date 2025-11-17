import orderManagement from './raw/intents/order-management.intent.json'
import opsWorkbench from './raw/intents/ops-workbench.intent.json'
import tablePattern from './raw/patterns/table-with-server-filter.pattern.json'
import filterBarPattern from './raw/patterns/filter-bar.pattern.json'
import toolbarPattern from './raw/patterns/toolbar-with-quick-edit.pattern.json'
import workbenchPattern from './raw/patterns/workbench-layout.pattern.json'
import serviceAdapterPattern from './raw/patterns/service-adapter-query.pattern.json'
import zustandPattern from './raw/patterns/zustand-store-with-slices.pattern.json'
import orderListTemplate from './raw/templates/order-list-feature-skeleton.template.json'
import orderPlan from './raw/plans/order-management.plan.json'
import exportOrdersFlow from './raw/flows/export-orders.flow.ts?raw'

import type {
  IntentSpec,
  PatternSpec,
  PlanSpec,
  TemplateSpec,
} from '../types'

export const intents: IntentSpec[] = [
  orderManagement as IntentSpec,
  opsWorkbench as IntentSpec,
]

export const patterns: PatternSpec[] = [
  tablePattern as PatternSpec,
  filterBarPattern as PatternSpec,
  toolbarPattern as PatternSpec,
  workbenchPattern as PatternSpec,
  serviceAdapterPattern as PatternSpec,
  zustandPattern as PatternSpec,
]

export const patternsById = Object.fromEntries(
  patterns.map((pattern) => [pattern.id, pattern])
)

export const templates: TemplateSpec[] = [orderListTemplate as TemplateSpec]

export const plans: Record<string, PlanSpec> = {
  'order-management': orderPlan as PlanSpec,
}

export const flowSources: Record<string, string> = {
  exportOrders: exportOrdersFlow,
}
