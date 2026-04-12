'use client';

import { useState, useMemo } from 'react';
import { parseRecipeMarkdown } from '@/lib/utils/parse-recipe-markdown';
import type { ParsedRecipe } from '@/lib/utils/parse-recipe-markdown';

// ── Lightweight markdown → HTML preview ──────────────────────────────────────

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function inline(text: string): string {
  return esc(text).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

function markdownToHtml(md: string): string {
  if (!md.trim()) return '';
  const lines = md.split('\n');
  const parts: string[] = [];
  let inUl = false;
  let inOl = false;

  const closeList = () => {
    if (inUl) { parts.push('</ul>'); inUl = false; }
    if (inOl) { parts.push('</ol>'); inOl = false; }
  };

  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('# ')) {
      closeList();
      parts.push(`<h1 style="font-size:1.25rem;font-weight:700;margin-top:.5rem">${esc(t.slice(2))}</h1>`);
    } else if (t.startsWith('## ')) {
      closeList();
      parts.push(`<h2 style="font-size:1rem;font-weight:600;margin-top:1rem;color:#57534e">${esc(t.slice(3))}</h2>`);
    } else if (t.startsWith('> ')) {
      closeList();
      parts.push(`<blockquote style="border-left:3px solid #d6d3d1;padding-left:.75rem;color:#78716c;font-style:italic">${esc(t.slice(2))}</blockquote>`);
    } else if (/^[-*]\s/.test(t)) {
      if (!inUl) { parts.push('<ul style="margin-left:1.25rem;list-style:disc">'); inUl = true; }
      parts.push(`<li>${inline(t.slice(2))}</li>`);
    } else if (/^\d+[.)]\s/.test(t)) {
      if (!inOl) { parts.push('<ol style="margin-left:1.25rem;list-style:decimal">'); inOl = true; }
      parts.push(`<li>${inline(t.replace(/^\d+[.)]\s/, ''))}</li>`);
    } else if (t === '') {
      closeList();
      parts.push('<div style="height:.5rem"></div>');
    } else {
      closeList();
      parts.push(`<p style="color:#44403c">${inline(t)}</p>`);
    }
  }
  closeList();
  return parts.join('');
}

// ── Component ─────────────────────────────────────────────────────────────────

const PLACEHOLDER = `# Recipe Name

> Short description (optional)

**Prep time:** 20 min
**Cook time:** 30 min
**Servings:** 4

## Ingredients
- 200g ingredient
- 1 tbsp ingredient
- 3 item name

## Steps
1. First step.
2. Second step. [timer: 5min]

## Notes
Any notes here.

## Tags
tag1, tag2`;

interface Props {
  onImport: (parsed: ParsedRecipe) => void;
}

export default function MarkdownImport({ onImport }: Props) {
  const [markdown, setMarkdown] = useState('');

  const previewHtml = useMemo(() => markdownToHtml(markdown), [markdown]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Editor */}
        <div className="flex-1 flex flex-col">
          <label className="block text-sm font-medium text-stone-600 mb-1">Markdown</label>
          <textarea
            data-testid="markdown-input"
            value={markdown}
            onChange={e => setMarkdown(e.target.value)}
            placeholder={PLACEHOLDER}
            className="flex-1 min-h-96 w-full border border-stone-300 rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white resize-none"
          />
        </div>

        {/* Preview */}
        <div className="flex-1 flex flex-col">
          <span className="block text-sm font-medium text-stone-600 mb-1">Preview</span>
          <div
            data-testid="markdown-preview"
            className="flex-1 min-h-96 border border-stone-200 rounded-lg px-4 py-3 bg-stone-50 overflow-auto text-sm"
            dangerouslySetInnerHTML={{
              __html: previewHtml || '<p style="color:#a8a29e">Preview will appear here…</p>',
            }}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          data-testid="import-button"
          onClick={() => onImport(parseRecipeMarkdown(markdown))}
          disabled={!markdown.trim()}
          className="w-full sm:w-auto bg-orange-500 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-40 min-h-[44px]"
        >
          Import recipe
        </button>
      </div>
    </div>
  );
}
