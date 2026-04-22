'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useKeyboardShortcut } from '@/lib/hooks/useKeyboardShortcut';
import KeyboardShortcutsDialog from './KeyboardShortcutsDialog';
import { useT } from './LanguageContext';

export default function GlobalShortcuts() {
  const router = useRouter();
  const t = useT();
  const [showShortcuts, setShowShortcuts] = useState(false);

  useKeyboardShortcut('n', () => router.push('/recipes/new'));
  useKeyboardShortcut('?', () => setShowShortcuts(true));

  return (
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
  );
}
