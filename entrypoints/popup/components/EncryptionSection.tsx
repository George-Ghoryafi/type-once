import { useState } from 'react';
import { getSetting, setSetting, encryptAllData, decryptAllData } from '../../../lib/db';
import { deriveKey, generateSalt, createVerifier, checkVerifier } from '../../../lib/crypto';
import { setSessionKey, clearSessionKey } from '../../../lib/session';

interface EncryptionSectionProps {
  enabled: boolean;
  onToggled: (enabled: boolean) => void;
  onReload: () => Promise<void>;
}

export function EncryptionSection({ enabled, onToggled, onReload }: EncryptionSectionProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);

  const [showChangePass, setShowChangePass] = useState(false);
  const [changeOldPass, setChangeOldPass] = useState('');
  const [changeNewPass, setChangeNewPass] = useState('');
  const [changeConfirm, setChangeConfirm] = useState('');

  const handleEnable = async () => {
    if (!password) { setError('Enter a password'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setWorking(true);
    setError('');
    try {
      const salt = generateSalt();
      const key = await deriveKey(password, salt);
      const verifier = await createVerifier(key);
      await encryptAllData(key);
      await setSetting('encryptionEnabled', true);
      await setSetting('encryptionSalt', salt);
      await setSetting('encryptionVerifier', verifier);
      await setSessionKey(key);
      onToggled(true);
      setPassword('');
      setConfirm('');
      await onReload();
    } catch {
      setError('Failed to enable encryption');
    } finally {
      setWorking(false);
    }
  };

  const handleDisable = async () => {
    if (!password) { setError('Enter your current password to confirm'); return; }
    setWorking(true);
    setError('');
    try {
      const salt = await getSetting<string>('encryptionSalt', '');
      const verifier = await getSetting<string>('encryptionVerifier', '');
      const key = await deriveKey(password, salt);
      const valid = await checkVerifier(key, verifier);
      if (!valid) { setError('Incorrect password'); return; }
      await decryptAllData(key);
      await setSetting('encryptionEnabled', false);
      await setSetting('encryptionSalt', '');
      await setSetting('encryptionVerifier', '');
      await clearSessionKey();
      onToggled(false);
      setPassword('');
      await onReload();
    } catch {
      setError('Failed to disable encryption');
    } finally {
      setWorking(false);
    }
  };

  const handleChangePassword = async () => {
    if (!changeOldPass) { setError('Enter your current password'); return; }
    if (!changeNewPass) { setError('Enter a new password'); return; }
    if (changeNewPass.length < 8) { setError('New password must be at least 8 characters'); return; }
    if (changeNewPass !== changeConfirm) { setError('New passwords do not match'); return; }
    setWorking(true);
    setError('');
    try {
      const oldSalt = await getSetting<string>('encryptionSalt', '');
      const oldVerifier = await getSetting<string>('encryptionVerifier', '');
      const oldKey = await deriveKey(changeOldPass, oldSalt);
      const valid = await checkVerifier(oldKey, oldVerifier);
      if (!valid) { setError('Current password is incorrect'); return; }

      await decryptAllData(oldKey);
      const newSalt = generateSalt();
      const newKey = await deriveKey(changeNewPass, newSalt);
      const newVerifier = await createVerifier(newKey);
      await encryptAllData(newKey);

      await setSetting('encryptionSalt', newSalt);
      await setSetting('encryptionVerifier', newVerifier);
      await setSessionKey(newKey);

      setShowChangePass(false);
      setChangeOldPass('');
      setChangeNewPass('');
      setChangeConfirm('');
      setError('');
    } catch {
      setError('Failed to change password');
    } finally {
      setWorking(false);
    }
  };

  if (!enabled) {
    return (
      <div className="encryption-section">
        <h3 className="enc-title">Encryption <span className="enc-badge enc-badge--off">Off</span></h3>
        <p className="help-text">Encrypt all snippets and clipboard history at rest using AES-256-GCM.</p>
        <label>Password</label>
        <input
          type="password"
          className="activation-input"
          placeholder="Choose a strong password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <label>Confirm Password</label>
        <input
          type="password"
          className="activation-input"
          placeholder="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleEnable()}
        />
        {error && <span className="error-text">{error}</span>}
        <button
          className="enc-action-btn"
          onClick={handleEnable}
          disabled={working || !password}
        >
          {working ? 'Encrypting…' : 'Enable Encryption'}
        </button>
      </div>
    );
  }

  if (showChangePass) {
    return (
      <div className="encryption-section">
        <h3 className="enc-title">Change Password</h3>
        <label>Current Password</label>
        <input
          type="password"
          className="activation-input"
          placeholder="Current password"
          value={changeOldPass}
          onChange={(e) => setChangeOldPass(e.target.value)}
        />
        <label>New Password</label>
        <input
          type="password"
          className="activation-input"
          placeholder="New password (min 8 chars)"
          value={changeNewPass}
          onChange={(e) => setChangeNewPass(e.target.value)}
        />
        <label>Confirm New Password</label>
        <input
          type="password"
          className="activation-input"
          placeholder="Confirm new password"
          value={changeConfirm}
          onChange={(e) => setChangeConfirm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleChangePassword()}
        />
        {error && <span className="error-text">{error}</span>}
        <div className="enc-actions">
          <button className="enc-action-btn" onClick={handleChangePassword} disabled={working}>
            {working ? 'Saving…' : 'Save Password'}
          </button>
          <button
            className="enc-secondary-btn"
            onClick={() => { setShowChangePass(false); setError(''); setChangeOldPass(''); setChangeNewPass(''); setChangeConfirm(''); }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="encryption-section">
      <h3 className="enc-title">Encryption <span className="enc-badge enc-badge--on">Active</span></h3>
      <p className="help-text">All data is encrypted with AES-256-GCM. Enter your password below to make changes.</p>
      <label>Current Password</label>
      <input
        type="password"
        className="activation-input"
        placeholder="Your encryption password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <span className="error-text">{error}</span>}
      <div className="enc-actions">
        <button
          className="enc-secondary-btn"
          onClick={() => { setShowChangePass(true); setError(''); }}
        >
          Change Password
        </button>
        <button
          className="danger-btn enc-disable-btn"
          onClick={handleDisable}
          disabled={working || !password}
        >
          {working ? 'Decrypting…' : 'Disable'}
        </button>
      </div>
    </div>
  );
}
