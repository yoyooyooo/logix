import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')

const source = `
import { Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { fieldValue, fieldValues, useModule, useSelector } from '../../src/index.js'

const User = Logix.Module.make('FieldValueCompletionUser', {
  state: Schema.Struct({
    ready: Schema.Boolean,
    profile: Schema.Struct({
      name: Schema.String,
      age: Schema.Number,
    }),
  }),
  actions: {},
})

const user = useModule(User.tag)
useSelector(user, fieldValue(''))
useSelector(user, fieldValues(['']))
useSelector(user, fieldValues(['ready', '']))
useSelector(user, fieldValues(['ready', 'profile.name', '']))
useSelector(user, fieldValues(['ready', 'profile', 'profile.name', 'profile.age', 'ready', 'profile', 'profile.name', 'profile.age', 'ready', '']))
`

const createService = () => {
  const fileName = resolve(repoRoot, 'packages/logix-react/test/Contracts/__fieldValueCompletion.case.ts')
  const files = new Map([[fileName, source]])
  const options: ts.CompilerOptions = {
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    skipLibCheck: true,
    strict: true,
    target: ts.ScriptTarget.ESNext,
    types: ['node'],
  }

  const host: ts.LanguageServiceHost = {
    getCompilationSettings: () => options,
    getScriptFileNames: () => [fileName],
    getScriptSnapshot: (name) => {
      const inMemory = files.get(name)
      if (inMemory !== undefined) return ts.ScriptSnapshot.fromString(inMemory)
      if (!ts.sys.fileExists(name)) return undefined
      return ts.ScriptSnapshot.fromString(ts.sys.readFile(name) ?? '')
    },
    getScriptVersion: () => '0',
    getCurrentDirectory: () => repoRoot,
    getDefaultLibFileName: (opts) => ts.getDefaultLibFilePath(opts),
    fileExists: (name) => files.has(name) || ts.sys.fileExists(name),
    readFile: (name) => files.get(name) ?? ts.sys.readFile(name),
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
    realpath: ts.sys.realpath,
  }

  return {
    fileName,
    fieldValuePosition: source.indexOf("fieldValue('')") + "fieldValue('".length,
    fieldValuesPosition: source.indexOf("fieldValues([''])") + "fieldValues(['".length,
    fieldValuesSecondPosition: source.indexOf("fieldValues(['ready', ''])") + "fieldValues(['ready', '".length,
    fieldValuesThirdPosition:
      source.indexOf("fieldValues(['ready', 'profile.name', ''])") + "fieldValues(['ready', 'profile.name', '".length,
    fieldValuesTenthPosition:
      source.indexOf(
        "fieldValues(['ready', 'profile', 'profile.name', 'profile.age', 'ready', 'profile', 'profile.name', 'profile.age', 'ready', ''])",
      ) +
      "fieldValues(['ready', 'profile', 'profile.name', 'profile.age', 'ready', 'profile', 'profile.name', 'profile.age', 'ready', '"
        .length,
    service: ts.createLanguageService(host),
  }
}

describe('React selector fieldValue editor completion', () => {
  it('uses the first handle argument to offer fieldValue path completions inside useSelector', () => {
    const { fileName, fieldValuePosition, service } = createService()
    const completions = service.getCompletionsAtPosition(fileName, fieldValuePosition, {})
    const names = new Set(completions?.entries.map((entry) => entry.name) ?? [])

    expect(names.has('ready')).toBe(true)
    expect(names.has('profile')).toBe(true)
    expect(names.has('profile.name')).toBe(true)
    expect(names.has('profile.age')).toBe(true)
  })

  it('uses the first handle argument to offer fieldValues path completions inside array elements', () => {
    const { fileName, fieldValuesPosition, service } = createService()
    const completions = service.getCompletionsAtPosition(fileName, fieldValuesPosition, {})
    const names = new Set(completions?.entries.map((entry) => entry.name) ?? [])

    expect(names.has('ready')).toBe(true)
    expect(names.has('profile')).toBe(true)
    expect(names.has('profile.name')).toBe(true)
    expect(names.has('profile.age')).toBe(true)
  })

  it('offers the same fieldValues path completions for later array elements', () => {
    const { fileName, fieldValuesSecondPosition, service } = createService()
    const completions = service.getCompletionsAtPosition(fileName, fieldValuesSecondPosition, {})
    const names = new Set(completions?.entries.map((entry) => entry.name) ?? [])

    expect(names.has('ready')).toBe(true)
    expect(names.has('profile')).toBe(true)
    expect(names.has('profile.name')).toBe(true)
    expect(names.has('profile.age')).toBe(true)
  })

  it('keeps fieldValues path completions after multiple existing items', () => {
    const { fileName, fieldValuesThirdPosition, service } = createService()
    const completions = service.getCompletionsAtPosition(fileName, fieldValuesThirdPosition, {})
    const names = new Set(completions?.entries.map((entry) => entry.name) ?? [])

    expect(names.has('ready')).toBe(true)
    expect(names.has('profile')).toBe(true)
    expect(names.has('profile.name')).toBe(true)
    expect(names.has('profile.age')).toBe(true)
  })

  it('keeps fieldValues path completions through the tenth tuple slot', () => {
    const { fileName, fieldValuesTenthPosition, service } = createService()
    const completions = service.getCompletionsAtPosition(fileName, fieldValuesTenthPosition, {})
    const names = new Set(completions?.entries.map((entry) => entry.name) ?? [])

    expect(names.has('ready')).toBe(true)
    expect(names.has('profile')).toBe(true)
    expect(names.has('profile.name')).toBe(true)
    expect(names.has('profile.age')).toBe(true)
  })
})
