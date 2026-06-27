'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { updateUserPreferences, replayOnboarding } from '@/app/actions/preferences';
import { useToast } from '@/components/ui/ToastContext';
import { useT } from '@/components/ui/LanguageContext';
import ThemeToggle from '@/components/ui/ThemeToggle';
import LanguageToggle from '@/components/ui/LanguageToggle';
import FontSizeToggle from '@/components/ui/FontSizeToggle';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { logout, changePassword } from '@/app/actions/auth';

interface Props {
  email: string;
  initialSpaceName: string;
  spaceNameFallback: string;
}

export default function SettingsClient({ email, initialSpaceName, spaceNameFallback }: Props) {
  const t = useT();
  const { showToast } = useToast();
  const router = useRouter();
  const [spaceName, setSpaceName] = useState(initialSpaceName);
  const [saving, setSaving] = useState(false);
  const [confirmReplayOpen, setConfirmReplayOpen] = useState(false);
  const [replayPending, setReplayPending] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  async function saveNewPassword() {
    if (newPassword.length < 8) {
      showToast(t.settingsPasswordFailed, 'error');
      return;
    }
    setChangingPw(true);
    const result = await changePassword(newPassword);
    setChangingPw(false);
    if (!result.ok) {
      showToast(result.error ?? t.settingsPasswordFailed, 'error');
      return;
    }
    setNewPassword('');
    showToast(t.settingsPasswordChanged, 'success');
  }

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

  async function confirmReplay() {
    setReplayPending(true);
    const result = await replayOnboarding();
    setReplayPending(false);
    if (!result.ok) {
      showToast(t.spaceNameSaveFailed, 'error');
      return;
    }
    setConfirmReplayOpen(false);
    router.push('/recipes?tour=1');
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
        {/* Cycle 2 P0 #3: stack input + button vertically on <sm so a long
            space name like "Test Space 1777082963237" doesn't get visually
            clipped by the inline SAVE button on a 360px viewport. */}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id="space-name-input"
            type="text"
            value={spaceName}
            onChange={e => setSpaceName(e.target.value.slice(0, 30))}
            placeholder={spaceNameFallback}
            className="input-base flex-1 w-full"
            maxLength={30}
            aria-label={t.settingsSpaceNameLabel}
            data-testid="settings-space-name-input"
          />
          <button
            type="button"
            onClick={saveSpaceName}
            disabled={saving}
            className="btn-primary self-start sm:self-auto"
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
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 min-w-0">
          <span
            className="font-label text-sm tracking-wide"
            style={{ color: 'var(--text-2)' }}
          >
            {t.settingsThemeLabel}
          </span>
          <ThemeToggle />
          <span
            className="font-label text-sm tracking-wide"
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

      {/* Preferences */}
      <section>
        <h2 className="section-label mb-4">{t.settingsReplayOnboardingSection}</h2>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p
              className="font-body text-base mb-1"
              style={{ color: 'var(--text-1)' }}
            >
              {t.settingsReplayOnboardingLabel}
            </p>
            <p
              className="font-body text-sm"
              style={{ color: 'var(--text-3)' }}
            >
              {t.settingsReplayOnboardingDescription}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfirmReplayOpen(true)}
            className="btn-ghost flex-shrink-0 self-start"
            data-testid="settings-replay-onboarding-btn"
            disabled={replayPending}
          >
            {t.settingsReplayOnboardingBtn}
          </button>
        </div>
      </section>

      {/* Password */}
      <section>
        <h2 className="section-label mb-4">{t.settingsPasswordSection}</h2>
        <label
          className="font-label block text-xs tracking-widest uppercase mb-1.5"
          style={{ color: 'var(--text-3)' }}
          htmlFor="new-password-input"
        >
          {t.settingsNewPasswordLabel}
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id="new-password-input"
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            className="input-base flex-1 w-full"
            aria-label={t.settingsNewPasswordLabel}
            data-testid="settings-new-password-input"
          />
          <button
            type="button"
            onClick={saveNewPassword}
            disabled={changingPw || newPassword.length < 8}
            className="btn-primary self-start sm:self-auto"
            data-testid="settings-change-password-btn"
          >
            {changingPw ? t.savingBtn : t.settingsChangePasswordBtn}
          </button>
        </div>
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

      <ConfirmDialog
        open={confirmReplayOpen}
        title={t.settingsReplayOnboardingConfirmTitle}
        description={t.settingsReplayOnboardingConfirmBody}
        confirmLabel={replayPending ? t.savingBtn : t.settingsReplayOnboardingConfirmBtn}
        cancelLabel={t.settingsReplayOnboardingCancelBtn}
        onConfirm={() => { void confirmReplay(); }}
        onCancel={() => setConfirmReplayOpen(false)}
      />
    </div>
  );
}
