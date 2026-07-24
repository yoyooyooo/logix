# <Layer Name>

## Owns

- <durable semantic responsibility>

## Must Not Own

- <nearest competing responsibility>

## Boundary

- <conflict behavior or authority relationship>

## Read Next

- [<entry artifact>](<path>)

## Promotion / Demotion

- <how material enters or leaves this layer>

## Internal Shape

The layer is flat by default. Add child partitions only after a durable ownership, security, retention, lifecycle, reader-routing, or repeated navigation boundary is established. Child partitions inherit this layer's authority.
