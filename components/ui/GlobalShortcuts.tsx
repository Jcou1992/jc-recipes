'use client';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import { useKeyboardShortcut } from '@/lib/hooks/useKeyboardShortcut';
import KeyboardShortcutsDialog from './KeyboardShortcutsDialog';
import { useT } from './LanguageContext';

// Routes where the floating [?] help affordance must NOT render — paper
// surfaces, brand splash, and immersive cook mode (which owns its own
// chrome). Keep aligned with RouteAwareWayfinder's HIDDEN_PATTERNS.
const HELP_HIDDEN = [/^\/login(\/|$)/, /^\/recipes\/print(\/|$)/, /\/cook(\/|$)/];

export default function GlobalShortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const t = useT();
  const [showShortcuts, setShowShortcuts] = useState(false);

  useKeyboardShortcut('n', () => router.push('/recipes/new'));
  useKeyboardShortcut('?', () => setShowShortcuts(true));

  const showHelpButton = !pathname || !HELP_HIDDEN.some(re => re.test(pathname));

  return (
    <>
      {showHelpButton && (
        <button
          type="button"
          onClick={() => setShowShortcuts(true)}
          className="font-label fixed bottom-4 right-4 z-30 rounded-full transition-all"
          style={{
            // Cycle 4: discoverable shortcut affordance for both modes.
            // Brut already advertises ?:HELP in its kicker; classic had
            // zero visible surface for the dialog. This button adds a
            // single round [?] glyph in the bottom-right safe area, AA
            // contrast against --bg, scoped to non-immersive routes.
            width: '44px',
            height: '44px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            color: 'var(--text-2)',
            fontSize: '14px',
            letterSpacing: '0.05em',
            boxShadow: 'var(--shadow-card, 0 1px 2px rgb(0 0 0 / 0.08))',
            // Respect iOS safe-area on phones in landscape.
            marginBottom: 'env(safe-area-inset-bottom, 0)',
            marginRight: 'env(safe-area-inset-right, 0)',
          }}
          aria-label={t.shortcutHelp}
          aria-haspopup="dialog"
          aria-expanded={showShortcuts}
          data-testid="global-shortcut-help"
        >
          ?
        </button>
      )}
      <KeyboardShortcutsDialog
        open={showShortcuts}
        onClose={() => setShowShortcuts(false)}
        title={t.keyboardShortcutsTitle}
        closeLabel={t.shortcutClose}
        shortcuts={[
          { key: '/', description: t.shortcutSearch },
          { key: 'N', description: t.shortcutNew },
          { key: 'F', description: t.shortcutFilter },
          { key: 'Esc', description: t.shortcutClear },
          { key: '?', description: t.shortcutHelp },
        ]}
      />
    </>
  );
}
