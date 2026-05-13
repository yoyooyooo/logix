import {
  resolvePlaygroundProject,
  type PlaygroundProject,
  type PlaygroundRegistry,
} from '../../Project.js'
import { normalizePlaygroundProject } from './project.js'

export const resolveNormalizedPlaygroundProject = (
  registry: PlaygroundRegistry,
  projectId: string,
): PlaygroundProject | undefined => {
  const project = resolvePlaygroundProject(registry, projectId)
  return project ? normalizePlaygroundProject(project) : undefined
}
