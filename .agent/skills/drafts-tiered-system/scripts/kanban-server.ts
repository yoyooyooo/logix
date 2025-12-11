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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
// __dirname is .../scripts
const SKILL_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(SKILL_ROOT, '../../..');
const DRAFTS_ROOT = path.resolve(REPO_ROOT, 'docs/specs/drafts');
const UI_DIST = path.resolve(SKILL_ROOT, 'ui/dist');

// Types
interface Draft {
    title: string;
    path: string; // Relative to DRAFTS_ROOT
    level: string; // L1-L9 or Topic
    status: string;
    value: string;
    priority: number | string; // Number for rank, string for legacy
    filename: string;
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
        const { data } = matter(content);

        // Use rank if available (migration), otherwise priority, otherwise 9999
        // If priority is a string (legacy), we keep it as is for frontend to handle or display
        let priority: number | string = 9999;
        if (data.rank !== undefined) {
            priority = data.rank;
        } else if (data.priority !== undefined) {
            priority = data.priority;
        }

        drafts.push({
            title: data.title || path.basename(file, '.md'),
            path: file,
            level: getLevel(fullPath),
            status: data.status || 'unknown',
            value: data.value || '-',
            priority: priority,
            filename: path.basename(file),
            related: data.related || []
        });
    }

    return c.json(drafts);
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
    const { data, content: markdown } = matter(content);

    // Filter related links to ensure they exist
    if (data.related && Array.isArray(data.related)) {
        data.related = data.related.filter((link: string) => {
            try {
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
