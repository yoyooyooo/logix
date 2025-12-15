import type { FormCaseLink } from "./types"
import { case01BasicProfile } from "./case01-basic-profile"
import { case02LineItems } from "./case02-line-items"
import { case03Contacts } from "./case03-contacts"
import { case04NestedAllocations } from "./case04-nested-allocations"
import { case05UniqueCode } from "./case05-unique-code"
import { case06AttachmentsUpload } from "./case06-attachments-upload"
import { case07Wizard } from "./case07-wizard"
import { case08RegionCascading } from "./case08-region-cascading"
import { case09SchemaDecode } from "./case09-schema-decode"
import { case10Conditional } from "./case10-conditional-cleanup"
import { case11DynamicListCascadingExclusion } from "./case11-dynamic-list-cascading-exclusion"

export const formCases: ReadonlyArray<FormCaseLink> = [
  case01BasicProfile,
  case02LineItems,
  case03Contacts,
  case04NestedAllocations,
  case05UniqueCode,
  case06AttachmentsUpload,
  case07Wizard,
  case08RegionCascading,
  case09SchemaDecode,
  case10Conditional,
  case11DynamicListCascadingExclusion,
]
