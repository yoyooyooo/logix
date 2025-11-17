import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import glob from 'fast-glob';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import open from 'open';

// Configuration
// We are in .codex/skills/drafts-tiered-system, so we need to go up 3 levels to get to repo root
const REPO_ROOT = path.resolve(process.cwd(), '../../..');
const DRAFTS_ROOT = path.resolve(REPO_ROOT, 'docs/specs/drafts');

// Types
interface Draft {
    title: string;
    path: string;
    level: string; // L1-L9 or Topic
    status: string;
    value: string;
    priority: string;
    filename: string;
}

interface Column {
    id: string;
    title: string;
    drafts: Draft[];
}

// Helper: Get Level from path
function getLevel(filePath: string): string {
    const relPath = path.relative(DRAFTS_ROOT, filePath);
    const parts = relPath.split(path.sep);
    if (parts[0] === 'topics') return 'Topics';
    if (parts[0].match(/^L\d$/)) return parts[0];
    return 'Uncategorized';
}

// Helper: Get Priority Score for sorting
function getPriorityScore(priority: string): number {
    switch (priority?.toLowerCase()) {
        case 'now': return 4;
        case 'next': return 3;
        case 'later': return 2;
        case 'parked': return 1;
        default: return 0;
    }
}

async function scanDrafts(): Promise<Column[]> {
    if (!fs.existsSync(DRAFTS_ROOT)) {
        console.error(`Error: Drafts root not found at ${DRAFTS_ROOT}`);
        return [];
    }

    // 1. Scan files
    const files = await glob('**/*.md', {
        cwd: DRAFTS_ROOT,
        ignore: ['README.md', 'index.md', '**/node_modules/**']
    });

    const drafts: Draft[] = [];

    // 2. Parse Frontmatter
    for (const file of files) {
        const fullPath = path.join(DRAFTS_ROOT, file);
        const content = fs.readFileSync(fullPath, 'utf-8');
        const { data } = matter(content);

        drafts.push({
            title: data.title || path.basename(file, '.md'),
            path: file,
            level: getLevel(fullPath),
            status: data.status || 'unknown',
            value: data.value || '-',
            priority: data.priority || '-',
            filename: path.basename(file)
        });
    }

    // 3. Group by Level
    // Topics first, then L9 -> L1
    const columns: Column[] = [
        { id: 'Topics', title: 'Topics', drafts: [] },
        { id: 'L9', title: 'L9 Inbox', drafts: [] },
        { id: 'L8', title: 'L8 Research', drafts: [] },
        { id: 'L7', title: 'L7 Notes', drafts: [] },
        { id: 'L6', title: 'L6 Drafting', drafts: [] },
        { id: 'L5', title: 'L5 Proposal', drafts: [] },
        { id: 'L4', title: 'L4 Definition', drafts: [] },
        { id: 'L3', title: 'L3 Spec Draft', drafts: [] },
        { id: 'L2', title: 'L2 Candidate', drafts: [] },
        { id: 'L1', title: 'L1 Stable', drafts: [] },
    ];

    const columnMap = new Map(columns.map(c => [c.id, c]));

    for (const draft of drafts) {
        const col = columnMap.get(draft.level);
        if (col) {
            col.drafts.push(draft);
        }
    }

    // Sort drafts within columns by priority
    for (const col of columns) {
        col.drafts.sort((a, b) => getPriorityScore(b.priority) - getPriorityScore(a.priority));
    }

    return columns;
}

function generateHtml(columns: Column[]): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Drafts Kanban</title>
  <script src="https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js"></script>
  <style>
    :root {
      --bg: #1e1e1e;
      --card-bg: #2d2d2d;
      --text: #e0e0e0;
      --text-dim: #a0a0a0;
      --border: #3e3e3e;
      --accent: #4a9eff;
      --tag-core: #ff6b6b;
      --tag-vision: #feca57;
      --tag-ext: #48dbfb;
      --prio-now: #ff4757;
      --prio-next: #ffa502;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 20px;
      overflow-x: auto;
    }
    h1 { margin-bottom: 20px; font-size: 24px; }
    .board {
      display: flex;
      gap: 16px;
      height: calc(100vh - 80px);
      min-width: max-content;
    }
    .column {
      background: #252526;
      border-radius: 6px;
      width: 300px;
      display: flex;
      flex-direction: column;
      border: 1px solid var(--border);
    }
    .column-header {
      padding: 12px;
      font-weight: 600;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #2d2d2d;
      border-top-left-radius: 6px;
      border-top-right-radius: 6px;
    }
    .count {
      background: var(--border);
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
    }
    .column-body {
      padding: 8px;
      overflow-y: auto;
      flex: 1;
      min-height: 50px; /* Drop target area */
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 12px;
      margin-bottom: 8px;
      cursor: grab;
      transition: transform 0.1s, box-shadow 0.1s;
      user-select: none;
    }
    .card:hover {
      border-color: var(--text-dim);
    }
    .card:active {
      cursor: grabbing;
    }
    .card.sortable-ghost {
      opacity: 0.4;
      background: #383838;
      border: 1px dashed var(--text-dim);
    }
    .card.sortable-drag {
      opacity: 1;
      background: var(--card-bg);
      box-shadow: 0 5px 15px rgba(0,0,0,0.3);
    }
    .card-title {
      font-weight: 500;
      margin-bottom: 8px;
      line-height: 1.4;
    }
    .card-meta {
      display: flex;
      gap: 8px;
      font-size: 11px;
      color: var(--text-dim);
      flex-wrap: wrap;
      align-items: center;
    }
    .tag {
      padding: 2px 6px;
      border-radius: 4px;
      background: var(--border);
      color: var(--text);
    }
    .tag.value-core { color: var(--tag-core); border: 1px solid var(--tag-core); background: transparent; }
    .tag.value-vision { color: var(--tag-vision); border: 1px solid var(--tag-vision); background: transparent; }
    .tag.prio-now { background: var(--prio-now); color: white; border: none; }
    .tag.prio-next { background: var(--prio-next); color: black; border: none; }

    .filename {
      font-family: monospace;
      font-size: 10px;
      opacity: 0.6;
      margin-top: 8px;
      display: block;
    }
    a { text-decoration: none; color: inherit; display: block; }
  </style>
</head>
<body>
  <h1>Drafts Tiered System Kanban</h1>
  <div class="board">
    ${columns.map(col => `
      <div class="column" data-id="${col.id}">
        <div class="column-header">
          <span>${col.title}</span>
          <span class="count">${col.drafts.length}</span>
        </div>
        <div class="column-body">
          ${col.drafts.map(draft => `
            <div class="card" onclick="window.location.href='vscode://file/${path.join(DRAFTS_ROOT, draft.path)}'">
              <div class="card-title">${draft.title}</div>
              <div class="card-meta">
                ${draft.priority !== '-' ? `<span class="tag prio-${draft.priority.toLowerCase()}">${draft.priority}</span>` : ''}
                ${draft.value !== '-' ? `<span class="tag value-${draft.value.toLowerCase()}">${draft.value}</span>` : ''}
                <span>${draft.status}</span>
              </div>
              <span class="filename">${draft.filename}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('')}
  </div>

  <script>
    document.querySelectorAll('.column-body').forEach(el => {
      new Sortable(el, {
        group: 'shared', // set both lists to same group
        animation: 150,
        ghostClass: 'sortable-ghost',
        dragClass: 'sortable-drag',
        delay: 100, // slight delay to prevent accidental drags when clicking
        delayOnTouchOnly: true
      });
    });
  </script>
</body>
</html>
  `;
}

const app = new Hono();

app.get('/', async (c) => {
    const columns = await scanDrafts();
    const html = generateHtml(columns);
    return c.html(html);
});

const port = 0; // Use random free port
console.log(`Starting server...`);

serve({
    fetch: app.fetch,
    port
}, (info) => {
    const url = `http://localhost:${info.port}`;
    console.log(`Opening browser at ${url}`);
    open(url);
});
