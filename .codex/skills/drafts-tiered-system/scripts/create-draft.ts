import fs from 'node:fs';
import path from 'node:path';

import glob from 'fast-glob';
import matter from 'gray-matter';

import { findDraftsPaths, inferSpecIdFromFilename, normalizeSpecId } from './draftsSpec';

type Options = {
  title: string;
  level: string;
  topic?: string;
  slug?: string;
  filename?: string;
  status: string;
  value: string;
  priority: string;
  id?: string;
  force: boolean;
  json: boolean;
};

type CreateResult = {
  id: string;
  title: string;
  level: string;
  topic?: string;
  file: string; // repo-relative
  fullPath: string;
};

function usage(): string {
  return [
    'Usage: create-draft.ts [options] <title>',
    '',
    'Options:',
    '  --level <L1|L2|...|L9|Topics>   Target tier (default: L9)',
    '  --topic <name>                 When level=Topics, target topics/<name>/',
    '  --slug <slug>                  Filename slug (ASCII recommended)',
    '  --file <name.md>               Explicit filename (overrides --slug)',
    '  --id <NNN>                     Explicit 3-digit SpecID (default: auto allocate)',
    '  --status <draft|active|...>    Frontmatter status (default: draft)',
    '  --value <core|vision|...>      Frontmatter value (default: background)',
    '  --priority <now|next|...>      Frontmatter priority (default: later)',
    '  --force                        Overwrite if file exists',
    '  --json                         Output JSON result',
    '  --help                         Show help',
    '',
    'Examples:',
    '  tsx scripts/create-draft.ts "Sandbox runner idea"',
    '  tsx scripts/create-draft.ts --level L6 "Devtools UX note"',
    '  tsx scripts/create-draft.ts --level Topics --topic sandbox-runtime "Boundary notes"',
    '  tsx scripts/create-draft.ts --id 205 --level L5 --slug sandbox-boundary "Logix sandbox boundary"',
  ].join('\n');
}

function parseArgs(argv: string[]): Options {
  let level = 'L9';
  let topic: string | undefined;
  let slug: string | undefined;
  let filename: string | undefined;
  let status = 'draft';
  let value = 'background';
  let priority = 'later';
  let id: string | undefined;
  let force = false;
  let json = false;
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === '--help' || arg === '-h') {
      process.stdout.write(`${usage()}\n`);
      process.exit(0);
    }

    if (arg === '--force') {
      force = true;
      continue;
    }

    if (arg === '--json') {
      json = true;
      continue;
    }

    const take = (name: string): string => {
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        throw new Error(`Error: ${name} requires a value.`);
      }
      i++;
      return next;
    };

    if (arg === '--level') {
      level = take('--level');
      continue;
    }

    if (arg.startsWith('--level=')) {
      level = arg.slice('--level='.length);
      continue;
    }

    if (arg === '--topic') {
      topic = take('--topic');
      continue;
    }

    if (arg.startsWith('--topic=')) {
      topic = arg.slice('--topic='.length);
      continue;
    }

    if (arg === '--slug') {
      slug = take('--slug');
      continue;
    }

    if (arg.startsWith('--slug=')) {
      slug = arg.slice('--slug='.length);
      continue;
    }

    if (arg === '--file') {
      filename = take('--file');
      continue;
    }

    if (arg.startsWith('--file=')) {
      filename = arg.slice('--file='.length);
      continue;
    }

    if (arg === '--status') {
      status = take('--status');
      continue;
    }

    if (arg.startsWith('--status=')) {
      status = arg.slice('--status='.length);
      continue;
    }

    if (arg === '--value') {
      value = take('--value');
      continue;
    }

    if (arg.startsWith('--value=')) {
      value = arg.slice('--value='.length);
      continue;
    }

    if (arg === '--priority') {
      priority = take('--priority');
      continue;
    }

    if (arg.startsWith('--priority=')) {
      priority = arg.slice('--priority='.length);
      continue;
    }

    if (arg === '--id') {
      id = take('--id');
      continue;
    }

    if (arg.startsWith('--id=')) {
      id = arg.slice('--id='.length);
      continue;
    }

    if (arg.startsWith('--')) {
      throw new Error(`Error: Unknown option '${arg}'. Use --help for usage information.`);
    }

    positional.push(arg);
  }

  const title = positional.join(' ').trim();
  if (!title) {
    throw new Error('Error: Missing <title>. Use --help for usage information.');
  }

  return {
    title,
    level,
    topic,
    slug,
    filename,
    status,
    value,
    priority,
    id,
    force,
    json,
  };
}

function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug;
}

function stripFrontmatter(raw: string): string {
  return raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}

function inferTitleFromBody(body: string, fallback: string): string {
  const line = body.split(/\r?\n/).find((l) => l.startsWith('# '));
  return line ? line.replace(/^#\s+/, '').trim() : fallback;
}

async function collectUsedIds(draftsRoot: string): Promise<Set<string>> {
  const files = await glob('**/*.md', {
    cwd: draftsRoot,
    ignore: ['README.md', 'index.md', '**/node_modules/**'],
  });

  const ids = new Set<string>();

  for (const relPath of files) {
    const fullPath = path.join(draftsRoot, relPath);
    const raw = fs.readFileSync(fullPath, 'utf-8');
    let data: any = {};
    let body = '';
    try {
      const parsed = matter(raw);
      data = parsed.data;
      body = parsed.content;
    } catch {
      data = {};
      body = stripFrontmatter(raw);
    }

    const id = normalizeSpecId(data.id) ?? inferSpecIdFromFilename(path.basename(relPath));
    if (id) ids.add(id);

    // If no id, but file has a top-level heading like "# 205 · ...", allow best-effort inference.
    if (!id) {
      const title = data.title || inferTitleFromBody(body, '');
      const m = title.match(/\b([0-9]{3})\b/);
      if (m) ids.add(m[1]!);
    }
  }

  return ids;
}

function allocateNextId(used: Set<string>): string {
  let max = 0;
  for (const id of used) {
    const n = Number.parseInt(id, 10);
    if (Number.isFinite(n) && n > max) max = n;
  }

  for (let n = max + 1; n <= 999; n++) {
    const candidate = String(n).padStart(3, '0');
    if (!used.has(candidate)) return candidate;
  }

  throw new Error('Error: No available SpecID (exhausted 001-999).');
}

function resolveTargetDir(draftsRoot: string, level: string, topic?: string): { level: string; topic?: string; dir: string } {
  if (level === 'Topics' || level === 'topics') {
    if (!topic) {
      throw new Error('Error: --topic is required when --level Topics.');
    }
    const safeTopic = topic.trim().replace(/[/\\]+/g, '-');
    return { level: 'Topics', topic: safeTopic, dir: path.join(draftsRoot, 'topics', safeTopic) };
  }

  if (!/^L[1-9]$/.test(level)) {
    throw new Error('Error: --level must be L1..L9 or Topics.');
  }

  return { level, dir: path.join(draftsRoot, level) };
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{{${k}}}`, v);
  }
  return out;
}

function getSkillRoot(): string {
  return path.resolve(__dirname, '..');
}

async function createDraftFile(opts: Options): Promise<CreateResult> {
  const { repoRoot, draftsRoot } = findDraftsPaths();

  const used = await collectUsedIds(draftsRoot);
  const explicitId = opts.id ? normalizeSpecId(opts.id) : undefined;
  if (opts.id && !explicitId) {
    throw new Error('Error: --id must be a 1-3 digit number (will be normalized to 3 digits).');
  }

  const id = explicitId ?? allocateNextId(used);
  if (used.has(id)) {
    throw new Error(`Error: SpecID ${id} is already in use.`);
  }

  const target = resolveTargetDir(draftsRoot, opts.level, opts.topic);
  fs.mkdirSync(target.dir, { recursive: true });

  let fileName = opts.filename?.trim();
  if (fileName) {
    if (fileName.includes('/') || fileName.includes('\\')) {
      throw new Error('Error: --file must be a base filename (no path separators).');
    }
    if (!fileName.endsWith('.md')) fileName = `${fileName}.md`;
  } else {
    const slug = (opts.slug ? slugify(opts.slug) : slugify(opts.title)) || 'draft';
    fileName = `${id}-${slug}.md`;
  }

  const fullPath = path.join(target.dir, fileName);
  if (fs.existsSync(fullPath) && !opts.force) {
    throw new Error(`Error: File already exists: ${fullPath} (use --force to overwrite).`);
  }

  const skillRoot = getSkillRoot();
  const templatePath = path.join(skillRoot, 'assets/templates/draft-spec-template.md');
  const template = fs.readFileSync(templatePath, 'utf-8');

  const now = new Date();
  const date = now.toISOString().slice(0, 10);

  const rendered = renderTemplate(template, {
    ID: id,
    TITLE: opts.title,
    STATUS: opts.status,
    DATE: date,
    VALUE: opts.value,
    PRIORITY: opts.priority,
  });

  fs.writeFileSync(fullPath, rendered, 'utf-8');

  const relToRepo = path.relative(repoRoot, fullPath).replaceAll(path.sep, '/');

  return {
    id,
    title: opts.title,
    level: target.level,
    topic: target.topic,
    file: relToRepo,
    fullPath,
  };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const result = await createDraftFile(opts);

  if (opts.json) {
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }

  process.stdout.write(`Created ${result.id} at ${result.file}\n`);
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`${msg}\n`);
  process.exit(1);
});

