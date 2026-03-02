import type { CliInvocation } from '../args.js'
import { COMMAND_REGISTRY_MAP } from '../commandRegistry.js'
import type { JsonValue } from '../result.js'

export type PreflightFailure = {
  readonly code: string
  readonly message: string
  readonly hint?: string
  readonly data?: Readonly<Record<string, JsonValue>>
}

export type PreflightContext = {
  readonly argv: ReadonlyArray<string>
  readonly argvWithConfigPrefix: ReadonlyArray<string>
  readonly invocation: CliInvocation
  readonly stdinIsTTY: boolean
  readonly env: NodeJS.ProcessEnv
}

const RUN_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,63}$/

const hasFlag = (argv: ReadonlyArray<string>, flag: `--${string}`): boolean => {
  if (argv.includes(flag)) return true
  return argv.some((token) => token.startsWith(`${flag}=`))
}

const makeFailure = (input: PreflightFailure): PreflightFailure => input

const parseBooleanEnv = (name: string, value: string): boolean => {
  const normalized = value.trim().toLowerCase()
  if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') return true
  if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') return false
  throw makeFailure({
    code: 'CLI_INVALID_ARGUMENT',
    message: `[Logix][CLI] 环境变量 ${name} 必须是布尔值（1/0/true/false/yes/no/on/off）`,
  })
}

const allowNonTtyDangerousWrite = (env: NodeJS.ProcessEnv): boolean => {
  const raw = env.LOGIX_CLI_ALLOW_NON_TTY_DANGEROUS_WRITE
  if (!raw || raw.trim().length === 0) return false
  return parseBooleanEnv('LOGIX_CLI_ALLOW_NON_TTY_DANGEROUS_WRITE', raw)
}

const assertNoMutuallyExclusiveArgs = (argv: ReadonlyArray<string>): void => {
  if (hasFlag(argv, '--out') && hasFlag(argv, '--outRoot')) {
    throw makeFailure({
      code: 'CLI_INVALID_ARGUMENT',
      message: '[Logix][CLI] 参数互斥：--out 与 --outRoot 不能同时提供',
      data: {
        argv: Array.from(argv),
        exclusive: ['--out', '--outRoot'],
      },
    })
  }
}

const assertSessionNameLegal = (invocation: CliInvocation): void => {
  const runId = invocation.global.runId
  if (RUN_ID_PATTERN.test(runId)) return
  throw makeFailure({
    code: 'CLI_INVALID_ARGUMENT',
    message: `[Logix][CLI] runId 非法：${runId}`,
    hint: 'runId 仅允许字母/数字开头，后续可包含 . _ : - ，最大 64 字符',
    data: {
      runId,
      expectedPattern: RUN_ID_PATTERN.source,
    },
  })
}

const ALWAYS_DANGEROUS_NON_TTY_COMMANDS = new Set<CliInvocation['command']>(['extension.load', 'extension.reload'])

const isDangerousWriteCommand = (invocation: CliInvocation): boolean => {
  if (ALWAYS_DANGEROUS_NON_TTY_COMMANDS.has(invocation.command)) return true
  const entry = COMMAND_REGISTRY_MAP.get(invocation.command)
  return invocation.global.mode === 'write' && entry?.contract.category === 'write'
}

const assertDangerousWriteAllowed = (context: PreflightContext): void => {
  if (!isDangerousWriteCommand(context.invocation)) return
  if (context.stdinIsTTY) return
  if (allowNonTtyDangerousWrite(context.env)) return

  throw makeFailure({
    code: 'CLI_NON_TTY_DANGEROUS_WRITE_DENIED',
    message: `[Logix][CLI] non-TTY 环境默认拒绝危险写操作：${context.invocation.command}`,
    hint: '如确认自动化流程可安全执行，请显式设置 LOGIX_CLI_ALLOW_NON_TTY_DANGEROUS_WRITE=1',
    data: {
      command: context.invocation.command,
      mode: context.invocation.global.mode ?? 'report',
      stdinIsTTY: context.stdinIsTTY,
    },
  })
}

export const runPreflight = (context: PreflightContext): void => {
  assertNoMutuallyExclusiveArgs(context.argv)
  assertSessionNameLegal(context.invocation)
  assertDangerousWriteAllowed(context)
}
