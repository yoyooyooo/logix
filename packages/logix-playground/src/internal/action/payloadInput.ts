export type ActionPayloadParseResult =
  | { readonly success: true; readonly value: unknown }
  | { readonly success: false; readonly message: string }

export const parseActionPayloadInput = (
  text: string,
  options: { readonly maxBytes?: number } = {},
): ActionPayloadParseResult => {
  const maxBytes = options.maxBytes ?? 8_192
  if (new TextEncoder().encode(text).length > maxBytes) {
    return { success: false, message: `Payload exceeds ${maxBytes} bytes.` }
  }

  try {
    return { success: true, value: JSON.parse(text) }
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : String(error) }
  }
}
