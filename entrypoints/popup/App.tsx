import { useState, useEffect } from 'react';
import {
  getAllSnippets, deleteSnippet, deleteClipboardItem,
  getSetting, setSetting,
  getClipboardHistory,
  type Snippet, type ClipboardItem,
} from '../../lib/db';
import { getSessionKey } from '../../lib/session';
import { Onboarding } from './Onboarding';
import { UnlockView } from './components/UnlockView';
import { SettingsView } from './components/SettingsView';
import { EditorView } from './components/EditorView';
import { MainView } from './components/MainView';
import './App.css';

type View = 'LOADING' | 'ONBOARDING' | 'UNLOCK' | 'MAIN' | 'EDITOR' | 'SETTINGS';

async function activeKey(): Promise<CryptoKey | undefined> {
  const enabled = await getSetting('encryptionEnabled', false);
  if (!enabled) return undefined;
  return (await getSessionKey()) ?? undefined;
}

export default function App() {
  const [view, setView] = useState<View>('LOADING');
  const [searchQuery, setSearchQuery] = useState('');

  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [clipboard, setClipboard] = useState<ClipboardItem[]>([]);
  const [customTypes, setCustomTypes] = useState<string[]>([]);

  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);
  const [editorInitialText, setEditorInitialText] = useState('');

  const [activation, setActivation] = useState('//');
  const [initialActivation, setInitialActivation] = useState('//');
  const [encryptionEnabled, setEncryptionEnabled] = useState(false);

  useEffect(() => { initApp(); }, []);

  const initApp = async () => {
    const onboardingDone = await getSetting('onboardingComplete', true);
    if (!onboardingDone) {
      setView('ONBOARDING');
      return;
    }
    await resumeAfterGate();
  };

  const resumeAfterGate = async () => {
    const encEnabled = await getSetting('encryptionEnabled', false);
    setEncryptionEnabled(encEnabled);
    if (encEnabled) {
      const key = await getSessionKey();
      if (!key) { setView('UNLOCK'); return; }
    }
    await loadAll();
  };

  const loadAll = async () => {
    const key = await activeKey();
    const [snips, clip, custom, act] = await Promise.all([
      getAllSnippets(key),
      getClipboardHistory(key),
      getSetting<string[]>('customSnippetTypes', []),
      getSetting('activationCommand', '//'),
    ]);
    setSnippets(snips);
    setClipboard(clip);
    setCustomTypes(custom);
    setActivation(act);
    setInitialActivation(act);
    setView('MAIN');
  };

  // ── Navigation callbacks ──────────────────────────────────────────

  const handleOnboardingComplete = async () => {
    await setSetting('onboardingComplete', true);
    await resumeAfterGate();
  };

  const handleUnlockReset = () => {
    setEncryptionEnabled(false);
    setSnippets([]);
    setClipboard([]);
    setView('MAIN');
  };

  const handleSnippetSaved = (snippet: Snippet, isEdit: boolean) => {
    if (isEdit) {
      setSnippets((prev) => prev.map((s) => (s.id === snippet.id ? snippet : s)));
    } else {
      setSnippets((prev) => [...prev, snippet]);
    }
    setEditingSnippet(null);
    setEditorInitialText('');
    setView('MAIN');
  };

  const handleDeleteSnippet = async (id: string) => {
    await deleteSnippet(id);
    setSnippets((prev) => prev.filter((s) => s.id !== id));
  };

  const handleDeleteClipboard = async (id: string) => {
    await deleteClipboardItem(id);
    setClipboard((prev) => prev.filter((c) => c.id !== id));
  };

  const openEditor = (snippet?: Snippet, prefillText?: string) => {
    setEditingSnippet(snippet ?? null);
    setEditorInitialText(prefillText ?? '');
    setView('EDITOR');
  };

  if (view === 'LOADING') return null;

  return (
    <div className="app">
      {view === 'MAIN' && (
        <div className="header">
          <h1>TypeOnce</h1>
          {encryptionEnabled && <span className="lock-indicator" title="Encryption active">🔒</span>}
          <input
            className="search-bar"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button className="settings-toggle" onClick={() => setView('SETTINGS')} title="Settings">
            ⚙️
          </button>
        </div>
      )}

      <div className="view-container">
        {view === 'ONBOARDING' && (
          <Onboarding onComplete={handleOnboardingComplete} />
        )}

        {view === 'UNLOCK' && (
          <UnlockView onUnlocked={loadAll} onReset={handleUnlockReset} />
        )}

        {view === 'SETTINGS' && (
          <SettingsView
            activation={activation}
            initialActivation={initialActivation}
            encryptionEnabled={encryptionEnabled}
            snippets={snippets}
            onBack={() => setView('MAIN')}
            onActivationChange={setActivation}
            onEncryptionToggled={setEncryptionEnabled}
            onReload={loadAll}
            onSnippetsCleared={() => setSnippets([])}
            onClipboardCleared={() => setClipboard([])}
          />
        )}

        {view === 'EDITOR' && (
          <EditorView
            key={editingSnippet?.id ?? 'new'}
            editingSnippet={editingSnippet}
            initialText={editorInitialText}
            customTypes={customTypes}
            onSaved={handleSnippetSaved}
            onCustomTypeAdded={setCustomTypes}
            onCancel={() => { setEditingSnippet(null); setEditorInitialText(''); setView('MAIN'); }}
          />
        )}

        {view === 'MAIN' && (
          <MainView
            snippets={snippets}
            clipboard={clipboard}
            searchQuery={searchQuery}
            onDeleteSnippet={handleDeleteSnippet}
            onEditSnippet={(s) => openEditor(s)}
            onDeleteClipboard={handleDeleteClipboard}
            onSaveClipboard={(item) => openEditor(undefined, item.text)}
            onAddSnippet={() => openEditor()}
          />
        )}
      </div>
    </div>
  );
}
