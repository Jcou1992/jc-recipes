'use client';

import { useState, useMemo, useRef } from 'react';
import { parseRecipeMarkdown } from '@/lib/utils/parse-recipe-markdown';
import type { ParsedRecipe } from '@/lib/utils/parse-recipe-markdown';
import { useToast } from '@/components/ui/ToastContext';

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

const PLACEHOLDER = `# Recipe name

> Brief description (optional)

**Prep time:** 20 min
**Cook time:** 30 min
**Servings:** 4

## Ingredients
- 200g ingredient
- 1 tbsp ingredient
- 3 name

## Steps
1. First step.
2. Second step. [timer: 5min]

## Notes
Notes here.

## Tags
tag1, tag2`;

interface Props {
  onImport: (parsed: ParsedRecipe) => void;
}

export default function MarkdownImport({ onImport }: Props) {
  const [markdown, setMarkdown] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (markdown.trim() && !window.confirm('Replace current content?')) {
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = evt => {
      setMarkdown((evt.target?.result as string) ?? '');
      setParseError(null);
    };
    reader.onerror = () => { showToast('Could not read that file. Try copy/paste instead.', 'error'); };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleImport() {
    const parsed = parseRecipeMarkdown(markdown);
    if (!parsed.title.trim()) {
      setParseError('Add a title with "# Recipe name" on the first line.');
      return;
    }
    if (parsed.ingredients.length === 0 && parsed.steps.length === 0) {
      setParseError('No ingredients or steps found. Check the section headings ("## Ingredients", "## Steps").');
      return;
    }
    setParseError(null);
    onImport(parsed);
  }

  const previewHtml = useMemo(() => markdownToHtml(markdown), [markdown]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Editor */}
        <div className="flex-1 flex flex-col">
          <label
            htmlFor="markdown-input"
            className="font-label block text-xs tracking-widest uppercase mb-1.5"
            style={{ color: 'var(--text-3)' }}
          >
            Markdown
          </label>
          <div className="flex items-center gap-2 mb-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.txt"
              className="sr-only"
              aria-label="Upload Markdown file"
              data-testid="md-file-upload-input"
              onChange={handleFileSelect}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-ghost font-label text-xs tracking-wider uppercase px-3 min-h-[44px] rounded-lg"
              data-testid="md-file-upload-btn"
            >
              Upload .md file
            </button>
          </div>
          <textarea
            id="markdown-input"
            data-testid="markdown-input"
            value={markdown}
            onChange={e => {
              setMarkdown(e.target.value);
              if (parseError) setParseError(null);
            }}
            placeholder={PLACEHOLDER}
            aria-label="Paste recipe in Markdown"
            className="flex-1 min-h-96 w-full rounded-lg px-3 py-2.5 font-mono text-sm resize-none focus:outline-none"
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-input)',
              color: 'var(--text-1)',
            }}
            aria-invalid={parseError ? true : undefined}
            aria-describedby={parseError ? 'markdown-parse-error' : undefined}
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
              __html: previewHtml || `<p class="md-placeholder">Preview will appear here…</p>`,
            }}
          />
        </div>
      </div>

      {parseError && (
        <p
          id="markdown-parse-error"
          role="alert"
          className="font-body text-sm"
          style={{ color: 'var(--color-terracotta)' }}
          data-testid="markdown-parse-error"
        >
          {parseError}
        </p>
      )}

      <div className="flex w-full sm:justify-end">
        <button
          type="button"
          data-testid="import-button"
          onClick={handleImport}
          disabled={!markdown.trim()}
          className="btn-primary w-full sm:w-auto"
        >
          Import recipe
        </button>
      </div>
    </div>
  );
}
