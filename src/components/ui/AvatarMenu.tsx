'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';
import FontSizeToggle from './FontSizeToggle';
import { logout } from '@/app/actions/auth';
import { useT } from './LanguageContext';

interface Props {
  initial: string; // single character for the circle
  email: string;   // shown in dropdown header
  isAdmin?: boolean; // gates the Admin link
}

export default function AvatarMenu({ initial, email, isAdmin = false }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useFocusTrap(menuRef, open, () => setOpen(false));

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-10 h-10 rounded-full flex items-center justify-center font-label text-sm font-bold tracking-wide uppercase transition-all"
        style={{
          // Cycle 2 P2: non-destructive tone — was filled terracotta-contrast
          // (the same red as the DELETE button), reading as a hot CTA.  Now
          // reads as a *named slot*: bone/card surface, terracotta initial,
          // soft terracotta border.
          background: 'var(--bg-card)',
          color: 'var(--color-terracotta)',
          border: '1px solid color-mix(in oklch, var(--color-terracotta) 35%, transparent)',
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t.avatarMenuAriaLabel}
        data-testid="avatar-menu-btn"
      >
        {initial}
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={t.avatarMenuAriaLabel}
          tabIndex={-1}
          className="absolute right-0 mt-2 rounded-xl overflow-hidden animate-scale-in z-40"
          style={{
            minWidth: '240px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-dialog)',
          }}
          data-testid="avatar-menu-dropdown"
        >
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="font-label text-xs tracking-wide" style={{ color: 'var(--text-3)' }}>
              {t.avatarMenuSignedInAs}
            </p>
            <p className="font-body text-sm truncate" style={{ color: 'var(--text-1)' }}>
              {email}
            </p>
          </div>

          <Link
            href="/settings"
            className="block px-4 py-3 font-label text-sm tracking-wider uppercase transition-colors hover:brightness-110"
            style={{ color: 'var(--text-1)' }}
            onClick={() => setOpen(false)}
            data-testid="avatar-menu-settings-link"
          >
            {t.avatarMenuSettings}
          </Link>
          <Link
            href="/team"
            className="block px-4 py-3 font-label text-sm tracking-wider uppercase transition-colors hover:brightness-110"
            style={{ color: 'var(--text-1)', borderTop: '1px solid var(--border)' }}
            onClick={() => setOpen(false)}
            data-testid="avatar-menu-team-link"
          >
            {t.navTeam}
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className="block px-4 py-3 font-label text-sm tracking-wider uppercase transition-colors hover:brightness-110"
              style={{ color: 'var(--color-terracotta)', borderTop: '1px solid var(--border)' }}
              onClick={() => setOpen(false)}
              data-testid="avatar-menu-admin-link"
            >
              {t.navAdmin}
            </Link>
          )}
          <Link
            href="/recipes?tour=1"
            className="block px-4 py-3 font-label text-sm tracking-wider uppercase transition-colors hover:brightness-110"
            style={{ color: 'var(--text-1)', borderTop: '1px solid var(--border)' }}
            onClick={() => setOpen(false)}
            data-testid="avatar-menu-tour-link"
          >
            {t.avatarMenuTour}
          </Link>

          <div
            className="px-4 py-2 flex items-center gap-2"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <span className="font-label text-xs tracking-wide" style={{ color: 'var(--text-3)' }}>
              {t.avatarMenuQuick}
            </span>
            <div className="ml-auto flex items-center gap-1">
              <FontSizeToggle />
              <ThemeToggle />
              <LanguageToggle />
            </div>
          </div>

          <form action={logout} style={{ borderTop: '1px solid var(--border)' }}>
            <button
              type="submit"
              className="w-full text-left px-4 py-3 font-label text-sm tracking-wider uppercase transition-colors"
              style={{ color: 'var(--color-terracotta)' }}
              data-testid="avatar-menu-signout"
            >
              {t.navSignOut}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
