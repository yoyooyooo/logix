import { createHash } from 'node:crypto'

export const fileDigestOfText = (text: string): string =>
  createHash('sha256').update(text, 'utf8').digest('hex')

