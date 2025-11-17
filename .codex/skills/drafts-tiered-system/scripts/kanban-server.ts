import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import glob from 'fast-glob';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { cors } from 'hono/cors';
import open from 'open';

import { fileURLToPath } from 'node:url';
import { findDraftsPaths, inferSpecIdFromFilename, normalizeSpecId, normalizeSpecIdList } from './draftsSpec';
import { buildSpecGraph } from './specGraphCore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
// Resolve drafts root from current working directory (preferred), with env overrides:
// - DRAFTS_REPO_ROOT=<repo>
// - DRAFTS_ROOT=<repo>/docs/specs/drafts
const { repoRoot: REPO_ROOT, draftsRoot: DRAFTS_ROOT } = findDraftsPaths();
const SKILL_ROOT = path.resolve(__dirname, '..');
const UI_DIST = path.resolve(SKILL_ROOT, 'ui/dist');

// Types
interface Draft {
    id?: string;
    title: string;
    path: string; // Relative to DRAFTS_ROOT
    level: string; // L1-L9 or Topic
    status: string;
    value: string;
    priority: number | string; // Number for rank, string for legacy
    filename: string;
    depends_on?: string[];
    related?: string[];
}

interface UpdateDraftRequest {
    level?: string;
    priority?: number;
}

// Helper: Get Level from path
function getLevel(filePath: string): string {
    const relPath = path.relative(DRAFTS_ROOT, filePath);
    const parts = relPath.split(path.sep);
    if (parts[0] === 'topics') return 'Topics';
    if (parts[0].match(/^L\d$/)) return parts[0];
    return 'Uncategorized';
}

// Helper: Ensure directory exists
function ensureDir(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function stripFrontmatter(raw: string): string {
    // Best-effort: if frontmatter is malformed YAML, we still want a readable body for title inference.
    return raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}

function inferTitleFromBody(body: string, fallback: string): string {
    const line = body.split(/\r?\n/).find((l) => l.startsWith('# '));
    return line ? line.replace(/^#\s+/, '').trim() : fallback;
}

const app = new Hono();

app.use('/*', cors());

// Middleware: Logger
app.use('*', async (c, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    console.log(`${c.req.method} ${c.req.path} - ${c.res.status} (${ms}ms)`);
});

// API: Get all drafts
app.get('/api/drafts', async (c) => {
    if (!fs.existsSync(DRAFTS_ROOT)) {
        return c.json({ error: 'Drafts root not found' }, 404);
    }

    const files = await glob('**/*.md', {
        cwd: DRAFTS_ROOT,
        ignore: ['README.md', 'index.md', '**/node_modules/**']
    });

    const drafts: Draft[] = [];

    for (const file of files) {
        const fullPath = path.join(DRAFTS_ROOT, file);
        const content = fs.readFileSync(fullPath, 'utf-8');
        let data: any = {};
        let body = '';

        try {
            const parsed = matter(content);
            data = parsed.data;
            body = parsed.content;
        } catch {
            data = {};
            body = stripFrontmatter(content);
        }

        // Use rank if available (migration), otherwise priority, otherwise 9999
        // If priority is a string (legacy), we keep it as is for frontend to handle or display
        let priority: number | string = 9999;
        if (data.rank !== undefined) {
            priority = data.rank;
        } else if (data.priority !== undefined) {
            priority = data.priority;
        }

        const id = normalizeSpecId(data.id) ?? inferSpecIdFromFilename(file);
        const dependsOn = normalizeSpecIdList(data.depends_on);
        const related = Array.isArray(data.related) ? data.related.map(String) : [];

        drafts.push({
            id,
            title: data.title || inferTitleFromBody(body, path.basename(file, '.md')),
            path: file,
            level: getLevel(fullPath),
            status: data.status || 'unknown',
            value: data.value || '-',
            priority: priority,
            filename: path.basename(file),
            depends_on: dependsOn,
            related
        });
    }

    return c.json(drafts);
});

// API: Get graph (spec-level + item-level dependencies)
app.get('/api/graph', async (c) => {
    try {
        const graph = await buildSpecGraph();
        return c.json(graph);
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return c.json({ error: msg }, 500);
    }
});

// API: Get single draft details
app.get('/api/drafts/:filename', async (c) => {
    const filename = c.req.param('filename');
    const files = await glob(`**/${filename}`, { cwd: DRAFTS_ROOT });

    if (files.length === 0) {
        return c.json({ error: 'File not found' }, 404);
    }

    const fullPath = path.join(DRAFTS_ROOT, files[0]);
    const content = fs.readFileSync(fullPath, 'utf-8');
    let data: any = {};
    let markdown = '';

    try {
        const parsed = matter(content);
        data = parsed.data;
        markdown = parsed.content;
    } catch {
        data = {};
        markdown = stripFrontmatter(content);
    }

    // Filter related links to ensure they exist
    if (data.related && Array.isArray(data.related)) {
        data.related = data.related
            .map(String)
            .filter((link: string) => {
            try {
                // Allow SpecID references like "205" (resolved client-side).
                if (normalizeSpecId(link)) return true;

                // Strategy 1: Relative to current file
                const relativePath = path.resolve(path.dirname(fullPath), link);
                if (fs.existsSync(relativePath)) return true;

                // Strategy 2: Relative to DRAFTS_ROOT
                const rootPath = path.resolve(DRAFTS_ROOT, link);
                if (fs.existsSync(rootPath)) return true;

                return false;
            } catch (e) {
                return false;
            }
        });
    }

    if (data.depends_on !== undefined) {
        data.depends_on = normalizeSpecIdList(data.depends_on);
    }
    if (data.id !== undefined) {
        data.id = normalizeSpecId(data.id);
    }

    return c.json({
        ...data,
        content: markdown,
        path: files[0], // Relative path
        fullPath // Absolute path for opening in editor
    });
});

// API: Update draft (Move or Priority)
app.patch('/api/drafts/:filename', async (c) => {
    const filename = c.req.param('filename');
    const body = await c.req.json<UpdateDraftRequest>();

    // Find the file first
    const files = await glob(`**/${filename}`, { cwd: DRAFTS_ROOT });
    if (files.length === 0) {
        return c.json({ error: 'File not found' }, 404);
    }

    let currentRelPath = files[0];
    let fullPath = path.join(DRAFTS_ROOT, currentRelPath);

    // 1. Handle Move (Level Change)
    if (body.level && body.level !== getLevel(fullPath)) {
        const newDir = body.level === 'Topics'
            ? path.join(DRAFTS_ROOT, 'topics')
            : path.join(DRAFTS_ROOT, body.level);

        ensureDir(newDir);
        const newFullPath = path.join(newDir, filename);

        fs.renameSync(fullPath, newFullPath);
        fullPath = newFullPath; // Update path for next step
        currentRelPath = path.relative(DRAFTS_ROOT, newFullPath);
    }

    // 2. Handle Priority Update (Frontmatter)
    if (body.priority !== undefined) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const parsed = matter(content);

        // Update data
        parsed.data.priority = body.priority;
        // Remove old rank field if it exists to clean up
        if (parsed.data.rank !== undefined) {
            delete parsed.data.rank;
        }

        // Stringify back
        const newContent = matter.stringify(parsed.content, parsed.data);
        fs.writeFileSync(fullPath, newContent);
    }

    return c.json({ success: true, path: currentRelPath });
});

// Serve Frontend
// Use absolute path to avoid CWD ambiguity
app.use('/*', serveStatic({ root: UI_DIST }));

// Fallback for SPA routing
app.get('*', serveStatic({ path: path.join(UI_DIST, 'index.html') }));

const port = 0; // Random port
console.log(`Starting server...`);

serve({
    fetch: app.fetch,
    port
}, (info) => {
    const url = `http://localhost:${info.port}`;
    console.log(`Server running at ${url}`);
    open(url);
});
