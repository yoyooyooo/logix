import { Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { AuthProgram } from './auth.module'
import { ProjectGroupsProgram } from './project-groups.module'
import { ProjectMembersProgram } from './project-members.module'
import { ProjectsProgram } from './projects.module'

export const GalaxyRootDef = Logix.Module.make('GalaxyRoot', {
  state: Schema.Void,
  actions: {},
})

export const GalaxyRootProgram = Logix.Program.make(GalaxyRootDef, {
  initial: undefined,
  capabilities: {
    imports: [AuthProgram, ProjectsProgram, ProjectMembersProgram, ProjectGroupsProgram],
  },
  logics: [],
})
