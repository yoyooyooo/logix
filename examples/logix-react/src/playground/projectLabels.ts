const logixReactPlaygroundProjectPrefix = 'logix-react.'

const logixReactPlaygroundProjectLabels: Readonly<Record<string, string>> = {
  'logix-react.new-project': 'new project',
}

export const formatLogixReactPlaygroundProjectLabel = (id: string): string =>
  logixReactPlaygroundProjectLabels[id]
    ?? (id.startsWith(logixReactPlaygroundProjectPrefix)
      ? id.slice(logixReactPlaygroundProjectPrefix.length)
      : id)
