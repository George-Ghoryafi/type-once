import { useState } from 'react';
import { setSetting, deleteSnippet, clearClipboardHistory, type Snippet } from '../../../lib/db';
import { EncryptionSection } from './EncryptionSection';

interface SettingsViewProps {
  activation: string;
  initialActivation: string;
  encryptionEnabled: boolean;
  snippets: Snippet[];
  onBack: () => void;
  onActivationChange: (val: string) => void;
  onEncryptionToggled: (enabled: boolean) => void;
  onReload: () => Promise<void>;
  onSnippetsCleared: () => void;
  onClipboardCleared: () => void;
}

export function SettingsView({
  activation,
  initialActivation,
  encryptionEnabled,
  snippets,
  onBack,
  onActivationChange,
  onEncryptionToggled,
  onReload,
  onSnippetsCleared,
  onClipboardCleared,
}: SettingsViewProps) {
  const [activationError, setActivationError] = useState('');
  const [confirmClearSnippets, setConfirmClearSnippets] = useState(false);
  const [confirmClearClipboard, setConfirmClearClipboard] = useState(false);

  const handleActivationChange = (val: string) => {
    onActivationChange(val);
    if (!val) {
      setActivationError('Cannot be empty');
    } else if (val.length > 3) {
      setActivationError('Max 3 characters');
    } else if (!/^[!@#\$%&\/:]+$/.test(val)) {
      setActivationError('Only !, @, #, $, %, &, /, : allowed');
    } else {
      setActivationError('');
      setSetting('activationCommand', val);
    }
  };

  const handleClearSnippets = async () => {
    if (!confirmClearSnippets) {
      setConfirmClearSnippets(true);
      setTimeout(() => setConfirmClearSnippets(false), 3000);
      return;
    }
    for (const s of snippets) await deleteSnippet(s.id);
    onSnippetsCleared();
    setConfirmClearSnippets(false);
  };

  const handleClearClipboard = async () => {
    if (!confirmClearClipboard) {
      setConfirmClearClipboard(true);
      setTimeout(() => setConfirmClearClipboard(false), 3000);
      return;
    }
    await clearClipboardHistory();
    onClipboardCleared();
    setConfirmClearClipboard(false);
  };

  return (
    <div className="settings-panel">
      <div className="view-header">
        <h2>Settings</h2>
        <button className="back-btn" onClick={onBack}>← Back</button>
      </div>
      <label>Activation Command</label>
      <input
        className={`activation-input ${activationError ? 'error' : ''}`}
        value={activation}
        onChange={(e) => handleActivationChange(e.target.value)}
        placeholder="//"
      />
      {activationError ? (
        <span className="error-text">{activationError}</span>
      ) : (
        <div className="help-container">
          <span className="help-text">Max 3 chars. Allowed: !, @, #, $, %, &, /, :</span>
          {activation !== initialActivation && (
            <span className="refresh-warning">⚠️ Refresh active tab to apply</span>
          )}
        </div>
      )}

      <EncryptionSection
        enabled={encryptionEnabled}
        onToggled={onEncryptionToggled}
        onReload={onReload}
      />

      <div className="danger-zone">
        <h3>Danger Zone</h3>
        <button
          className={`danger-btn ${confirmClearSnippets ? 'confirm' : ''}`}
          onClick={handleClearSnippets}
        >
          {confirmClearSnippets ? 'Click to confirm deletion' : 'Clear All Snippets'}
        </button>
        <button
          className={`danger-btn ${confirmClearClipboard ? 'confirm' : ''}`}
          onClick={handleClearClipboard}
        >
          {confirmClearClipboard ? 'Click to confirm deletion' : 'Clear Clipboard History'}
        </button>
      </div>
    </div>
  );
}
