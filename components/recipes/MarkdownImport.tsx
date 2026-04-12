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
      parts.push(`<h1 class="md-h1">${esc(t.slice(2))}</h1>`);
    } else if (t.startsWith('## ')) {
      closeList();
      parts.push(`<h2 class="md-h2">${esc(t.slice(3))}</h2>`);
    } else if (t.startsWith('> ')) {
      closeList();
      parts.push(`<blockquote class="md-blockquote">${esc(t.slice(2))}</blockquote>`);
    } else if (/^[-*]\s/.test(t)) {
      if (!inUl) { parts.push('<ul class="md-ul">'); inUl = true; }
      parts.push(`<li class="md-li">${inline(t.slice(2))}</li>`);
    } else if (/^\d+[.)]\s/.test(t)) {
      if (!inOl) { parts.push('<ol class="md-ol">'); inOl = true; }
      parts.push(`<li class="md-li">${inline(t.replace(/^\d+[.)]\s/, ''))}</li>`);
    } else if (t === '') {
      closeList();
      parts.push('<div style="height:.5rem"></div>');
    } else {
      closeList();
      parts.push(`<p class="md-p">${inline(t)}</p>`);
    }
  }
  closeList();
  return parts.join('');
}

// ── Component ─────────────────────────────────────────────────────────────────

const PLACEHOLDER = `# Nombre de la receta

> Descripción breve (opcional)

**Prep time:** 20 min
**Cook time:** 30 min
**Servings:** 4

## Ingredients
- 200g ingrediente
- 1 tbsp ingrediente
- 3 nombre

## Steps
1. Primer paso.
2. Segundo paso. [timer: 5min]

## Notes
Notas aquí.

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
          <label
            className="font-label block text-xs tracking-widest uppercase mb-1.5"
            style={{ color: 'var(--text-3)' }}
          >
            Markdown
          </label>
          <textarea
            data-testid="markdown-input"
            value={markdown}
            onChange={e => setMarkdown(e.target.value)}
            placeholder={PLACEHOLDER}
            className="flex-1 min-h-96 w-full rounded-lg px-3 py-2.5 font-mono text-sm resize-none focus:outline-none"
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-input)',
              color: 'var(--text-1)',
            }}
          />
        </div>

        {/* Preview */}
        <div className="flex-1 flex flex-col">
          <span
            className="font-label block text-xs tracking-widest uppercase mb-1.5"
            style={{ color: 'var(--text-3)' }}
          >
            Preview
          </span>
          <div
            data-testid="markdown-preview"
            className="flex-1 min-h-96 rounded-lg px-4 py-3 overflow-auto text-sm leading-relaxed"
            style={{
              background: 'var(--bg-raised)',
              border: '1px solid var(--border)',
            }}
            dangerouslySetInnerHTML={{
              __html: previewHtml || `<p class="md-placeholder">La vista previa aparecerá aquí…</p>`,
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
          className="btn-primary w-full sm:w-auto"
        >
          Import recipe
        </button>
      </div>
    </div>
  );
}
