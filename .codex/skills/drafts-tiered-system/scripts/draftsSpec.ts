import fs from 'node:fs';
import path from 'node:path';

export type DraftsPaths = {
  repoRoot: string;
  draftsRoot: string;
};

export function findDraftsPaths(startDir: string = process.cwd()): DraftsPaths {
  const envDraftsRoot = process.env.DRAFTS_ROOT;
  if (envDraftsRoot) {
    const draftsRoot = path.resolve(envDraftsRoot);
    if (fs.existsSync(draftsRoot) && fs.statSync(draftsRoot).isDirectory()) {
      // Best-effort repoRoot inference (if draftsRoot ends with docs/specs/drafts).
      const parts = draftsRoot.split(path.sep);
      const tail = parts.slice(-3).join('/');
      const repoRoot =
        tail === 'docs/specs/drafts' ? parts.slice(0, -3).join(path.sep) : path.dirname(draftsRoot);
      return { repoRoot, draftsRoot };
    }
  }

  const envRepoRoot = process.env.DRAFTS_REPO_ROOT;
  if (envRepoRoot) {
    const repoRoot = path.resolve(envRepoRoot);
    const draftsRoot = path.join(repoRoot, 'docs/specs/drafts');
    if (fs.existsSync(draftsRoot) && fs.statSync(draftsRoot).isDirectory()) {
      return { repoRoot, draftsRoot };
    }
  }

  let dir = path.resolve(startDir);
  // Walk up until filesystem root.
  for (;;) {
    const candidate = path.join(dir, 'docs/specs/drafts');
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return { repoRoot: dir, draftsRoot: candidate };
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  throw new Error(
    'Drafts root not found (expected: <repo>/docs/specs/drafts). Run from within the target repo, or set DRAFTS_REPO_ROOT / DRAFTS_ROOT.'
  );
}

export function normalizeSpecId(value: unknown): string | undefined {
  if (value === undefined || value === null) return;

  const raw =
    typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : '';
  if (!raw) return;

  if (!/^[0-9]{1,3}$/.test(raw)) return;
  return raw.padStart(3, '0');
}

export function normalizeSpecIdList(value: unknown): string[] {
  if (value === undefined || value === null) return [];

  if (Array.isArray(value)) {
    return value.map(normalizeSpecId).filter((id): id is string => Boolean(id));
  }

  const id = normalizeSpecId(value);
  return id ? [id] : [];
}

export function inferSpecIdFromFilename(filename: string): string | undefined {
  const base = path.basename(filename);
  const m = base.match(/^([0-9]{3})-/);
  return m ? m[1] : undefined;
}

export function isItemId(value: string): boolean {
  return /^(US|FR|NFR|SC)-[0-9]{3}-[0-9]{3}$/.test(value);
}

