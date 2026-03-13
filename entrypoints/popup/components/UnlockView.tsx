import { useState } from 'react';
import { getSetting, setSetting, clearAllSnippets, clearClipboardHistory } from '../../../lib/db';
import { deriveKey, checkVerifier } from '../../../lib/crypto';
import { setSessionKey, clearSessionKey } from '../../../lib/session';

interface UnlockViewProps {
  onUnlocked: () => Promise<void>;
  onReset: () => void;
}

export function UnlockView({ onUnlocked, onReset }: UnlockViewProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleUnlock = async () => {
    if (!password || unlocking) return;
    setUnlocking(true);
    setError('');
    try {
      const salt = await getSetting<string>('encryptionSalt', '');
      const verifier = await getSetting<string>('encryptionVerifier', '');
      if (!salt || !verifier) {
        setError('Encryption data missing. Try re-enabling encryption in settings.');
        return;
      }
      const key = await deriveKey(password, salt);
      const valid = await checkVerifier(key, verifier);
      if (!valid) {
        setError('Incorrect password');
        return;
      }
      await setSessionKey(key);
      setPassword('');
      await onUnlocked();
    } catch {
      setError('Failed to unlock');
    } finally {
      setUnlocking(false);
    }
  };

  const handleResetAll = async () => {
    await clearAllSnippets();
    await clearClipboardHistory();
    await setSetting('encryptionEnabled', false);
    await setSetting('encryptionSalt', '');
    await setSetting('encryptionVerifier', '');
    await clearSessionKey();
    onReset();
  };

  if (showResetConfirm) {
    return (
      <div className="unlock-view">
        <div className="unlock-icon">⚠️</div>
        <h2>Erase All Data?</h2>
        <p className="unlock-desc reset-warning">
          This will permanently delete all your snippets and clipboard history and remove your encryption password. This cannot be undone.
        </p>
        <div className="reset-actions">
          <button className="reset-confirm-btn" onClick={handleResetAll}>
            Yes, erase everything
          </button>
          <button className="enc-secondary-btn" onClick={() => setShowResetConfirm(false)}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="unlock-view">
      <div className="unlock-icon">🔒</div>
      <h2>Locked</h2>
      <p className="unlock-desc">Enter your encryption password to access your snippets.</p>
      <input
        type="password"
        className="unlock-input"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
        autoFocus
      />
      {error && <span className="error-text">{error}</span>}
      <button
        className="unlock-btn"
        onClick={handleUnlock}
        disabled={!password || unlocking}
      >
        {unlocking ? 'Unlocking…' : 'Unlock'}
      </button>
      <button
        className="forgot-password-btn"
        onClick={() => { setError(''); setShowResetConfirm(true); }}
      >
        Forgot password?
      </button>
    </div>
  );
}
