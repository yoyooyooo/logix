import fs from 'node:fs';
import path from 'node:path';

import glob from 'fast-glob';
import matter from 'gray-matter';

import {
  findDraftsPaths,
  inferSpecIdFromFilename,
  isItemId,
  normalizeSpecId,
  normalizeSpecIdList,
} from './draftsSpec';

export type SpecNode = {
  id?: string;
  title: string;
  level: string;
  path: string; // repo-relative path: docs/specs/drafts/...
  status?: string;
  value?: string;
  priority?: string | number;
  depends_on: string[];
  related: string[]; // ids or paths
};

export type ItemNode = {
  id: string; // US-205-001
  kind: 'US' | 'FR' | 'NFR' | 'SC';
  spec_id: string; // 205
  text: string;
  file: string; // repo-relative path
  depends: string[];
  relates: string[];
  supports: string[];
};

export type Graph = {
  generated_at: string;
  repo_root: string;
  drafts_root: string;
  specs: SpecNode[];
  items: ItemNode[];
};

function getLevel(repoDraftsRoot: string, fullPath: string): string {
  const rel = path.relative(repoDraftsRoot, fullPath);
  const parts = rel.split(path.sep);
  if (parts[0] === 'topics') return 'Topics';
  if (/^L[0-9]$/.test(parts[0] ?? '')) return parts[0];
  return 'Uncategorized';
}

function normalizeRelated(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value.map(String).map((s) => s.trim()).filter(Boolean);
  return [String(value).trim()].filter(Boolean);
}

function stripFrontmatter(raw: string): string {
  return raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}

function inferTitleFromBody(body: string, fallback: string): string {
  const line = body.split(/\r?\n/).find((l) => l.startsWith('# '));
  return line ? line.replace(/^#\s+/, '').trim() : fallback;
}

function parseIdListFromValue(value: string): string[] {
  // Accept comma-separated IDs or space-separated IDs.
  return value
    .split(/[, ]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => isItemId(s) || Boolean(normalizeSpecId(s)));
}

function extractItems(markdown: string, file: string): ItemNode[] {
  const items: ItemNode[] = [];
  const lines = markdown.split(/\r?\n/);

  let current: ItemNode | null = null;

  const flush = () => {
    if (current) items.push(current);
    current = null;
  };

  for (const line of lines) {
    const header = line.match(/^\s*-\s*((US|FR|NFR|SC)-[0-9]{3}-[0-9]{3})\s*:\s*(.+?)\s*$/);
    if (header) {
      flush();
      const id = header[1];
      const kind = header[2] as ItemNode['kind'];
      const specId = id.split('-')[1]!;
      current = {
        id,
        kind,
        spec_id: specId,
        text: header[3],
        file,
        depends: [],
        relates: [],
        supports: [],
      };
      continue;
    }

    if (!current) continue;

    const depends = line.match(/^\s*-\s*Depends\s*:\s*(.*?)\s*$/i);
    if (depends) {
      current.depends.push(...parseIdListFromValue(depends[1]));
      continue;
    }

    const relates = line.match(/^\s*-\s*Relates\s*:\s*(.*?)\s*$/i);
    if (relates) {
      current.relates.push(...parseIdListFromValue(relates[1]));
      continue;
    }

    const supports = line.match(/^\s*-\s*Supports\s*:\s*(.*?)\s*$/i);
    if (supports) {
      current.supports.push(...parseIdListFromValue(supports[1]));
      continue;
    }
  }

  flush();
  return items;
}

export async function buildSpecGraph(): Promise<Graph> {
  const { repoRoot, draftsRoot } = findDraftsPaths();

  const files = await glob('**/*.md', {
    cwd: draftsRoot,
    ignore: ['README.md', 'index.md', '**/node_modules/**'],
  });

  const specs: SpecNode[] = [];
  const items: ItemNode[] = [];

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

    const specId = normalizeSpecId(data.id) ?? inferSpecIdFromFilename(path.basename(relPath));
    const dependsOn = normalizeSpecIdList(data.depends_on);
    const related = normalizeRelated(data.related);

    specs.push({
      id: specId,
      title: data.title || inferTitleFromBody(body, path.basename(relPath, '.md')),
      level: getLevel(draftsRoot, fullPath),
      path: path.join('docs/specs/drafts', relPath).replaceAll(path.sep, '/'),
      status: data.status,
      value: data.value,
      priority: data.priority,
      depends_on: dependsOn,
      related,
    });

    const fileForItem = path.join('docs/specs/drafts', relPath).replaceAll(path.sep, '/');
    items.push(...extractItems(body, fileForItem));
  }

  return {
    generated_at: new Date().toISOString(),
    repo_root: repoRoot,
    drafts_root: draftsRoot,
    specs,
    items,
  };
}

