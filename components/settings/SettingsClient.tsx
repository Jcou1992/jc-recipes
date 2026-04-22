'use client';

import { useState } from 'react';
import Link from 'next/link';
import { updateUserPreferences } from '@/app/actions/preferences';
import { useToast } from '@/components/ui/ToastContext';
import { useT } from '@/components/ui/LanguageContext';
import ThemeToggle from '@/components/ui/ThemeToggle';
import LanguageToggle from '@/components/ui/LanguageToggle';
import FontSizeToggle from '@/components/ui/FontSizeToggle';
import { logout } from '@/app/actions/auth';

interface Props {
  email: string;
  initialSpaceName: string;
  spaceNameFallback: string;
}

export default function SettingsClient({ email, initialSpaceName, spaceNameFallback }: Props) {
  const t = useT();
  const { showToast } = useToast();
  const [spaceName, setSpaceName] = useState(initialSpaceName);
  const [saving, setSaving] = useState(false);

  async function saveSpaceName() {
    const trimmed = spaceName.trim();
    setSaving(true);
    const result = await updateUserPreferences({ space_name: trimmed || null });
    setSaving(false);
    if (!result.ok) {
      showToast(t.spaceNameSaveFailed, 'error');
      return;
    }
    showToast(t.spaceNameSaved, 'success');
  }

  function handleReplayTour() {
    // Navigate to recipes with tour=1 (Wave 4 implements).
    window.location.href = '/recipes?tour=1';
  }

  return (
    <div className="space-y-10">
      {/* Workspace */}
      <section>
        <h2 className="section-label mb-4">{t.settingsWorkspaceSection}</h2>
        <label
          className="font-label block text-xs tracking-widest uppercase mb-1.5"
          style={{ color: 'var(--text-3)' }}
          htmlFor="space-name-input"
        >
          {t.settingsSpaceNameLabel}
        </label>
        <div className="flex gap-2">
          <input
            id="space-name-input"
            type="text"
            value={spaceName}
            onChange={e => setSpaceName(e.target.value.slice(0, 30))}
            placeholder={spaceNameFallback}
            className="input-base flex-1"
            maxLength={30}
            aria-label={t.settingsSpaceNameLabel}
            data-testid="settings-space-name-input"
          />
          <button
            type="button"
            onClick={saveSpaceName}
            disabled={saving}
            className="btn-primary"
            data-testid="settings-save-space-name"
          >
            {saving ? t.savingBtn : t.settingsSaveBtn}
          </button>
        </div>
        <p
          className="font-label text-xs tracking-wide mt-2"
          style={{ color: 'var(--text-3)' }}
        >
          {t.spaceNameCharLimit}
        </p>
      </section>

      {/* Appearance */}
      <section>
        <h2 className="section-label mb-4">{t.settingsAppearanceSection}</h2>
        <div className="flex flex-wrap items-center gap-4">
          <span
            className="font-label text-sm tracking-wide"
            style={{ color: 'var(--text-2)' }}
          >
            {t.settingsThemeLabel}
          </span>
          <ThemeToggle />
          <span
            className="font-label text-sm tracking-wide ml-4"
            style={{ color: 'var(--text-2)' }}
          >
            {t.fontSizeLabel}
          </span>
          <FontSizeToggle />
        </div>
      </section>

      {/* Language */}
      <section>
        <h2 className="section-label mb-4">{t.settingsLanguageSection}</h2>
        <LanguageToggle />
      </section>

      {/* Tour */}
      <section>
        <h2 className="section-label mb-4">{t.settingsTourSection}</h2>
        <button
          type="button"
          onClick={handleReplayTour}
          className="btn-ghost"
          data-testid="settings-replay-tour"
        >
          {t.settingsReplayTour}
        </button>
      </section>

      {/* Account */}
      <section>
        <h2 className="section-label mb-4">{t.settingsAccountSection}</h2>
        <p
          className="font-label text-xs tracking-widest uppercase mb-1"
          style={{ color: 'var(--text-3)' }}
        >
          {t.settingsEmailLabel}
        </p>
        <p className="font-body text-base mb-4" style={{ color: 'var(--text-1)' }}>
          {email}
        </p>
        <form action={logout}>
          <button type="submit" className="btn-danger" data-testid="settings-signout">
            {t.settingsSignOut}
          </button>
        </form>
      </section>

      <Link href="/recipes" className="btn-ghost inline-block">
        {t.settingsBackToRecipes}
      </Link>
    </div>
  );
}
