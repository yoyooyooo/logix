import { PlaygroundPage } from '@logixjs/playground/Playground'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  logixReactDefaultPlaygroundProjectId,
  logixReactPlaygroundRegistry,
} from './registry'
import { formatLogixReactPlaygroundProjectLabel } from './projectLabels'

const logixReactPlaygroundProjectIds = logixReactPlaygroundRegistry.map((project) => project.id)

export function LogixReactPlaygroundRoute(): React.ReactElement {
  const params = useParams()
  const navigate = useNavigate()
  const projectId = params.id ?? logixReactDefaultPlaygroundProjectId

  return (
    <PlaygroundPage
      registry={logixReactPlaygroundRegistry}
      projectId={projectId}
      projectSwitcher={(
        <Select
          value={projectId}
          onValueChange={(nextProjectId) => {
            if (nextProjectId) navigate(`/playground/${nextProjectId}`)
          }}
        >
          <SelectTrigger
            aria-label="Playground project"
            className="h-6 w-auto min-w-[128px] max-w-none border-gray-200 bg-gray-100 px-2 font-mono text-xs text-gray-600 shadow-none hover:bg-gray-200 focus-visible:ring-0"
          >
            <SelectValue>
              {(value) => formatLogixReactPlaygroundProjectLabel(String(value ?? projectId))}
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="start" className="min-w-[180px]">
            {logixReactPlaygroundProjectIds.map((id) => (
              <SelectItem key={id} value={id}>
                {formatLogixReactPlaygroundProjectLabel(id)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  )
}
