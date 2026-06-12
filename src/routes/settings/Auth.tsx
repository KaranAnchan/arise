/**
 * The Ascension panel: link an account, sync, sever. Local-first — without a backend
 * this explains itself and gets out of the way; signed out, the pitch is one line.
 */
import { useState } from 'react';
import { SYSTEM } from '../../data/strings';
import { sendMagicLink, signInWithGoogle, signOutAndWipe, useSession } from '../../store/auth';
import { supabase } from '../../store/supabase';
import { requestSync } from '../../store/sync';
import { SyncDot } from '../../ui/SyncDot';
import { SystemWindow } from '../../ui/SystemWindow';

export function Auth() {
  const session = useSession();
  const [email, setEmail] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmSever, setConfirmSever] = useState(false);

  if (!supabase) {
    return (
      <SystemWindow label={SYSTEM.settings.authLabel}>
        <p className="intel-line system-text system-text--muted">{SYSTEM.settings.noBackend}</p>
      </SystemWindow>
    );
  }

  if (session) {
    return (
      <SystemWindow label={SYSTEM.settings.authLabel}>
        <p className="intel-line system-text">
          {SYSTEM.settings.signedInAs(session.user.email ?? session.user.id)}
        </p>
        <p className="intel-line system-text system-text--muted">
          <SyncDot />
        </p>
        <button className="cta" onClick={() => void requestSync('manual')}>
          {SYSTEM.settings.syncNow}
        </button>
        <p className="intel-line system-text system-text--muted">{SYSTEM.settings.signOutWarning}</p>
        {confirmSever ? (
          <button className="cta cta--danger" onClick={() => void signOutAndWipe()}>
            {SYSTEM.settings.signOut} — CONFIRM
          </button>
        ) : (
          <button className="quest-claim" onClick={() => setConfirmSever(true)}>
            {SYSTEM.settings.signOut}
          </button>
        )}
      </SystemWindow>
    );
  }

  return (
    <SystemWindow label={SYSTEM.settings.authLabel}>
      <p className="intel-line system-text system-text--muted">{SYSTEM.settings.signedOutPitch}</p>
      <button className="cta" onClick={() => void signInWithGoogle()}>
        {SYSTEM.settings.google}
      </button>
      <div className="auth-email">
        <input
          className="field"
          type="email"
          inputMode="email"
          placeholder={SYSTEM.settings.emailPlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button
          className="log-btn"
          disabled={!email.includes('@')}
          onClick={() => {
            void sendMagicLink(email)
              .then(() => setNotice(SYSTEM.settings.magicSent))
              .catch((err: Error) => setNotice(err.message.toUpperCase()));
          }}
        >
          {SYSTEM.settings.magic}
        </button>
      </div>
      {notice && <p className="intel-line system-text">{notice}</p>}
    </SystemWindow>
  );
}
