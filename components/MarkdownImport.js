'use client';
import { useState, useMemo } from 'react';
import { parseRecipeMarkdown } from '@/lib/utils/parse-recipe-markdown';

// Minimal markdown → HTML renderer for the live preview.
// Handles the subset of markdown the parser supports.
function escHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inlineMarkdown(text) {
  // Bold **text**
  return escHtml(text).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

function markdownToHtml(md) {
  if (!md.trim()) return '';
  const lines = md.split('\n');
  const parts = [];
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
      parts.push(`<h1 class="md-h1">${escHtml(t.slice(2))}</h1>`);
    } else if (t.startsWith('## ')) {
      closeList();
      parts.push(`<h2 class="md-h2">${escHtml(t.slice(3))}</h2>`);
    } else if (t.startsWith('> ')) {
      closeList();
      parts.push(`<blockquote class="md-bq">${escHtml(t.slice(2))}</blockquote>`);
    } else if (t.match(/^[-*]\s/)) {
      if (!inUl) { parts.push('<ul class="md-ul">'); inUl = true; }
      parts.push(`<li>${inlineMarkdown(t.slice(2))}</li>`);
    } else if (t.match(/^\d+[.)]\s/)) {
      if (!inOl) { parts.push('<ol class="md-ol">'); inOl = true; }
      parts.push(`<li>${inlineMarkdown(t.replace(/^\d+[.)]\s/, ''))}</li>`);
    } else if (t === '') {
      closeList();
      parts.push('<div class="md-gap"></div>');
    } else {
      closeList();
      parts.push(`<p class="md-p">${inlineMarkdown(t)}</p>`);
    }
  }
  closeList();
  return parts.join('');
}

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

export default function MarkdownImport({ onImport }) {
  const [markdown, setMarkdown] = useState('');

  const previewHtml = useMemo(() => markdownToHtml(markdown), [markdown]);

  const handleImport = () => {
    const parsed = parseRecipeMarkdown(markdown);
    onImport(parsed);
  };

  return (
    <div className="space-y-4">
      {/* Editor + Preview */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Textarea */}
        <div className="flex-1 flex flex-col">
          <label className="block text-sm font-medium text-stone-600 mb-1">
            Markdown
          </label>
          <textarea
            data-testid="markdown-input"
            value={markdown}
            onChange={e => setMarkdown(e.target.value)}
            placeholder={PLACEHOLDER}
            className="flex-1 min-h-[420px] w-full border border-stone-300 rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white resize-none"
          />
        </div>

        {/* Preview */}
        <div className="flex-1 flex flex-col">
          <span className="block text-sm font-medium text-stone-600 mb-1">
            Preview
          </span>
          <div
            data-testid="markdown-preview"
            className="flex-1 min-h-[420px] border border-stone-200 rounded-lg px-4 py-3 bg-stone-50 overflow-auto prose-preview"
            dangerouslySetInnerHTML={{ __html: previewHtml || '<p class="text-stone-400 text-sm">Preview will appear here…</p>' }}
          />
        </div>
      </div>

      {/* Import button */}
      <div className="flex justify-end">
        <button
          type="button"
          data-testid="import-button"
          onClick={handleImport}
          disabled={!markdown.trim()}
          className="w-full sm:w-auto bg-orange-500 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-40"
        >
          Import recipe
        </button>
      </div>
    </div>
  );
}
