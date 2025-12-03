import fs from 'node:fs';
import path from 'node:path';
import glob from 'fast-glob';
import prompts from 'prompts';
import { spawn } from 'node:child_process';

const SKILLS_ROOT = path.resolve(process.cwd(), '.agent/skills');

interface SkillScript {
    skillName: string;
    scriptName: string;
    command: string;
    cwd: string;
}

async function scanSkills(): Promise<SkillScript[]> {
    if (!fs.existsSync(SKILLS_ROOT)) {
        console.error(`Skills root not found at ${SKILLS_ROOT}`);
        return [];
    }

    const packageJsons = await glob('*/package.json', { cwd: SKILLS_ROOT });
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
                        command: command as string,
                        cwd: skillDir
                    });
                }
            }
        } catch (e) {
            console.warn(`Failed to parse ${pkgPath}:`, e);
        }
    }

    return scripts;
}

async function main() {
    const scripts = await scanSkills();

    if (scripts.length === 0) {
        console.log('No skill scripts found.');
        return;
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

    if (response.script) {
        const s = response.script as SkillScript;
        console.log(`\n> Running ${s.scriptName} in ${s.skillName}...\n`);

        // Use npm run to execute the script in the skill's context
        const child = spawn('npm', ['run', s.scriptName], {
            cwd: s.cwd,
            stdio: 'inherit',
            shell: true
        });

        child.on('exit', (code) => {
            console.log(`\nScript exited with code ${code}`);
        });
    }
}

main().catch(console.error);
