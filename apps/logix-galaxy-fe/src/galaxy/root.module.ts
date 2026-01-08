import { Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { AuthImpl } from './auth.module'
import { ProjectGroupsImpl } from './project-groups.module'
import { ProjectMembersImpl } from './project-members.module'
import { ProjectsImpl } from './projects.module'

export const GalaxyRootDef = Logix.Module.make('GalaxyRoot', {
  state: Schema.Void,
  actions: {},
})

export const GalaxyRootModule = GalaxyRootDef.implement({
  initial: undefined,
  imports: [AuthImpl, ProjectsImpl, ProjectMembersImpl, ProjectGroupsImpl],
  logics: [],
})

