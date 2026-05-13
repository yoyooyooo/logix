#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const out = args.includes('--out') ? args[args.indexOf('--out') + 1] : 'docs/next/form-kernel-final-single-track-cutover-report.md'
const now = new Date().toISOString()

const readOptional = (file) => existsSync(file) ? readFileSync(file, 'utf8') : undefined

const sections = []
sections.push(`# Form/Kernel Final Single-Track Cutover Report\n`)
sections.push(`Generated: ${now}\n`)
sections.push(`## Required Claims\n\n- Do not claim final success unless all commands in LOCAL_AGENT_HANDOFF.md pass.\n- Quick perf is diagnostic only.\n- Missing artifacts must be listed as blockers or limited evidence.\n`)

const residueJsonPath = 'artifacts/final-cutover/residue.json'
const perfJsonPath = 'artifacts/final-cutover/perf.json'
const commandsPath = 'artifacts/final-cutover/commands.md'

sections.push(`## Residue Scanner\n\n${readOptional(residueJsonPath) ?? 'No residue artifact recorded.'}\n`)
sections.push(`## Performance\n\n${readOptional(perfJsonPath) ?? 'No performance artifact recorded.'}\n`)
sections.push(`## Commands\n\n${readOptional(commandsPath) ?? 'No command log recorded.'}\n`)
sections.push(`## Final Classification\n\nChoose one: success / success_with_limited_evidence / provisional / migrated_risk / migrated_cost / blocked / deferred.\n`)

mkdirSync(path.dirname(out), { recursive: true })
writeFileSync(out, sections.join('\n'), 'utf8')
console.log(`[final-cutover-report] wrote ${out}`)
