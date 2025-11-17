import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

import glob from 'fast-glob';
import prompts from 'prompts';

const SKILLS_ROOT = path.resolve(process.cwd(), '.codex/skills');

type SkillScriptKind = 'pnpm' | 'bash';

interface SkillScript {
    skillName: string;
    scriptName: string;
    kind: SkillScriptKind;
    command: string;
    cwd: string;
    filePath?: string;
}

function usage(): never {
    console.error(
        [
            '用法:',
            '  npx tsx scripts/skill-runner.ts -i',
            '  npx tsx scripts/skill-runner.ts <skillName> <scriptName> [--] [...scriptArgs]',
            '',
            '示例:',
            '  npx tsx scripts/skill-runner.ts effect-httpapi-postgres-crud generate -- --out apps/logix-galaxy-api/src --domain Todo --dry-run',
            '  npx tsx scripts/skill-runner.ts effect-httpapi-postgres-crud generate --out apps/logix-galaxy-api/src --domain Todo --dry-run',
            '  npx tsx scripts/skill-runner.ts speckit scripts/bash/check-prerequisites.sh --help',
            '',
            '说明:',
            '- 默认非交互：必须给出 <skillName> 与 <scriptName>；其余参数会透传给该 script。',
            '- <scriptName> 可为 package.json 的 scripts 名，或 skill 内 scripts/**/*.sh 的脚本名/相对路径。',
            '- 使用 -i 进入交互式选择（不透传额外参数）。'
        ].join('\n')
    );
    process.exit(1);
}

async function scanSkills(): Promise<SkillScript[]> {
    if (!fs.existsSync(SKILLS_ROOT)) {
        console.error(`Skills root not found at ${SKILLS_ROOT}`);
        return [];
    }

    const packageJsons = await glob('*/package.json', { cwd: SKILLS_ROOT, onlyFiles: true });
    const scripts: SkillScript[] = [];

    for (const pkgPath of packageJsons) {
        const fullPath = path.join(SKILLS_ROOT, pkgPath);
        const skillDir = path.dirname(fullPath);
        const skillName = path.basename(skillDir);

        try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const pkg = JSON.parse(content);

            if (pkg.scripts) {
                for (const [scriptName, command] of Object.entries(pkg.scripts)) {
                    scripts.push({
                        skillName,
                        scriptName,
                        kind: 'pnpm',
                        command: command as string,
                        cwd: skillDir
                    });
                }
            }
        } catch (e) {
            console.warn(`Failed to parse ${pkgPath}:`, e);
        }
    }

    const shFiles = await glob('*/scripts/**/*.sh', { cwd: SKILLS_ROOT, onlyFiles: true });
    for (const relPath of shFiles) {
        const parts = relPath.split('/');
        const skillName = parts[0];
        if (!skillName) continue;
        const scriptName = parts.slice(1).join('/');
        if (!scriptName) continue;
        const skillDir = path.join(SKILLS_ROOT, skillName);
        scripts.push({
            skillName,
            scriptName,
            kind: 'bash',
            command: `bash ${scriptName}`,
            cwd: skillDir,
            filePath: path.join(SKILLS_ROOT, relPath)
        });
    }

    return scripts;
}

function resolveSkillDir(skillName: string): string {
    return path.join(SKILLS_ROOT, skillName);
}

function stripLeadingDoubleDash(args: string[]): string[] {
    if (args[0] === '--') {
        return args.slice(1);
    }
    return args;
}

async function resolveShellScript(skillDir: string, scriptName: string): Promise<string | undefined> {
    const normalized = scriptName.trim().replaceAll('\\', '/');
    if (!normalized) return undefined;

    const candidates: string[] = [];

    const base = normalized.startsWith('scripts/') ? normalized : `scripts/${normalized}`;
    candidates.push(base);
    if (!base.endsWith('.sh')) candidates.push(`${base}.sh`);

    for (const rel of candidates) {
        const full = path.join(skillDir, rel);
        if (fs.existsSync(full) && fs.statSync(full).isFile()) {
            return rel;
        }
    }

    const patterns: string[] = [];
    if (normalized.startsWith('scripts/')) {
        patterns.push(normalized);
        if (!normalized.endsWith('.sh')) patterns.push(`${normalized}.sh`);
    } else {
        patterns.push(`scripts/**/${normalized}`);
        if (!normalized.endsWith('.sh')) patterns.push(`scripts/**/${normalized}.sh`);
    }

    const matches = await glob(patterns, { cwd: skillDir, onlyFiles: true, unique: true });
    if (matches.length === 1) {
        return matches[0];
    }
    if (matches.length > 1) {
        const list = matches.slice(0, 12).map((m) => `- ${m}`).join('\n');
        throw new Error(
            `找到多个 .sh 脚本匹配：${skillNameFromDir(skillDir)} ${scriptName}\n` +
            `${list}\n` +
            '请传更具体的脚本名（例如 scripts/<subdir>/<name>.sh）。'
        );
    }

    return undefined;
}

function skillNameFromDir(skillDir: string): string {
    return path.basename(skillDir);
}

async function loadSkillScript(skillName: string, scriptName: string): Promise<SkillScript> {
    const skillDir = resolveSkillDir(skillName);
    const pkgPath = path.join(skillDir, 'package.json');

    if (!fs.existsSync(skillDir)) {
        throw new Error(`未找到 skill：${skillDir}`);
    }

    if (fs.existsSync(pkgPath)) {
        const content = fs.readFileSync(pkgPath, 'utf-8');
        const pkg = JSON.parse(content) as { scripts?: Record<string, string> };
        const command = pkg.scripts?.[scriptName];
        if (command) {
            return {
                skillName,
                scriptName,
                kind: 'pnpm',
                command,
                cwd: skillDir
            };
        }
    }

    const shRel = await resolveShellScript(skillDir, scriptName);
    if (shRel) {
        return {
            skillName,
            scriptName: shRel,
            kind: 'bash',
            command: `bash ${shRel}`,
            cwd: skillDir,
            filePath: path.join(skillDir, shRel)
        };
    }

    let availablePnpm: string[] = [];
    if (fs.existsSync(pkgPath)) {
        try {
            const content = fs.readFileSync(pkgPath, 'utf-8');
            const pkg = JSON.parse(content) as { scripts?: Record<string, string> };
            availablePnpm = Object.keys(pkg.scripts ?? {}).sort((a, b) => a.localeCompare(b));
        } catch {
            // ignore
        }
    }
    const availableSh = await glob('scripts/**/*.sh', { cwd: skillDir, onlyFiles: true });

    const hints: string[] = [];
    if (availablePnpm.length > 0) hints.push(`可用 pnpm scripts：${availablePnpm.join(', ')}`);
    if (availableSh.length > 0) hints.push(`可用 .sh：${availableSh.slice(0, 12).join(', ')}${availableSh.length > 12 ? '…' : ''}`);

    throw new Error(
        `未找到 script：${skillName}/${scriptName}\n` + (hints.length > 0 ? hints.join('\n') : '该 skill 未声明任何 scripts')
    );
}

async function runScript(s: SkillScript, scriptArgs: string[]): Promise<number> {
    console.log(`\n> Running ${s.scriptName} in ${s.skillName}...\n`);

    const forwarded = stripLeadingDoubleDash(scriptArgs);
    const child =
        s.kind === 'bash'
            ? spawn('bash', [s.filePath ?? s.scriptName, ...forwarded], { cwd: s.cwd, stdio: 'inherit', shell: true })
            : (() => {
                  // 在 pnpm workspace 仓库里优先用 pnpm 执行（skill 的 scripts 本身也常调用 pnpm -C ../../..）
                  const args = ['run', s.scriptName];
                  if (forwarded.length > 0) {
                      args.push('--', ...forwarded);
                  }
                  return spawn('pnpm', args, { cwd: s.cwd, stdio: 'inherit', shell: true });
              })();

    return await new Promise<number>((resolve) => {
        child.on('exit', (code) => resolve(code ?? 1));
        child.on('error', () => resolve(1));
    });
}

async function runInteractive(): Promise<number> {
    const scripts = await scanSkills();

    if (scripts.length === 0) {
        console.log('No skill scripts found.');
        return 0;
    }

    const response = await prompts({
        type: 'autocomplete',
        name: 'script',
        message: 'Select a skill script to run:',
        choices: scripts.map(s => ({
            title: `[${s.skillName}] ${s.scriptName}`,
            value: s,
            description: s.command
        })),
        suggest: async (input, choices) => {
            if (!input) return choices;
            const lowerInput = input.toLowerCase();
            return choices.filter(c => c.title.toLowerCase().includes(lowerInput));
        }
    });

    if (!response.script) {
        return 0;
    }

    const s = response.script as SkillScript;
    return await runScript(s, []);
}

async function main(): Promise<void> {
    const argv = process.argv.slice(2);
    const interactive = argv.includes('-i');
    const args = argv.filter((a) => a !== '-i');

    if (interactive) {
        const code = await runInteractive();
        process.exit(code);
    }

    const skillName = args[0];
    const scriptName = args[1];
    if (!skillName || !scriptName) {
        usage();
    }

    const scriptArgs = args.slice(2);
    try {
        const s = await loadSkillScript(skillName, scriptName);
        const code = await runScript(s, scriptArgs);
        process.exit(code);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
