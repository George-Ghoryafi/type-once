import { useState, useEffect, useRef } from 'react';
import { getAllSnippets, addSnippet, deleteSnippet, getSetting, setSetting, type Snippet } from '../../lib/db';
import './App.css';

const VALID_ACTIVATION = /^[!@#$%&/]{1,3}$/;

export default function App() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [varName, setVarName] = useState('');
  const [text, setText] = useState('');
  const [activation, setActivation] = useState('//');
  const [initialActivation, setInitialActivation] = useState('//');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activationError, setActivationError] = useState('');

  useEffect(() => {
    getAllSnippets().then(setSnippets);
    getSetting('activationCommand', '//').then((val) => {
      setActivation(val);
      setInitialActivation(val);
    });
  }, []);

  const handleAdd = async () => {
    if (!varName.trim() || !text.trim()) return;
    const snippet = await addSnippet(varName.trim(), text.trim());
    setSnippets((prev) => [...prev, snippet]);
    setVarName('');
    setText('');
  };

  const handleDelete = async (id: string) => {
    await deleteSnippet(id);
    setSnippets((prev) => prev.filter((s) => s.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
  };

  const handleActivationChange = (val: string) => {
    setActivation(val);
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

  return (
    <div className="app">
      <div className="header">
        <h1>TypeOnce</h1>
        <button 
          className="settings-toggle" 
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          title="Settings"
        >
          ⚙️
        </button>
      </div>

      {isSettingsOpen && (
        <div className="settings-panel">
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
        </div>
      )}

      <div className="add-form">
        <input
          className="var-input"
          placeholder="var"
          value={varName}
          onChange={(e) => setVarName(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <input
          placeholder="text to expand..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button onClick={handleAdd} disabled={!varName.trim() || !text.trim()}>
          Add
        </button>
      </div>

      <div className="snippets">
        {snippets.length === 0 ? (
          <div className="empty">
            No snippets yet. Add one above, then type <code>{activationError ? '//' : activation}</code> in any input to expand.
          </div>
        ) : (
          snippets.map((s) => (
            <div className="snippet" key={s.id}>
              <span className="var-name">{s.variable}</span>
              <span className="arrow">→</span>
              <span className="text">{s.text}</span>
              <button className="delete-btn" onClick={() => handleDelete(s.id)} title="Delete">
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
