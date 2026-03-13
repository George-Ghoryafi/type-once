import { useState, useEffect } from 'react';
import { getAllSnippets, addSnippet, deleteSnippet, updateSnippet, getSetting, setSetting, getClipboardHistory, deleteClipboardItem, clearClipboardHistory, type Snippet, type ClipboardItem } from '../../lib/db';
import './App.css';

const VALID_ACTIVATION = /^[!@#$%&/]{1,3}$/;
const DEFAULT_TYPES = ['Phone Number', 'Email', 'Address', 'Website'];

type View = 'MAIN' | 'EDITOR' | 'SETTINGS';
type Tab = 'snippets' | 'clipboard';

function SnippetCard({ snippet, onDelete, onEdit }: { snippet: Snippet, onDelete: (id: string) => void, onEdit: (s: Snippet) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(snippet.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleting(true);
    setTimeout(() => onDelete(snippet.id), 300); // Small delay to show animation
  };

  return (
    <div className={`saveable-card ${expanded ? 'expanded' : ''} ${deleting ? 'deleting' : ''}`} onClick={() => setExpanded(!expanded)}>
      <div className="card-header">
        <span className="var-name">{snippet.variable}</span>
        {snippet.type && <span className="type-badge">{snippet.type}</span>}
      </div>
      <div className="card-body">{snippet.text}</div>
      {expanded && (
        <div className="card-actions">
          <button className={copied ? 'success' : ''} onClick={handleCopy}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
          <button onClick={(e) => { e.stopPropagation(); onEdit(snippet); }}>Edit</button>
          <button className="danger" onClick={handleDelete}>
            {deleting ? '...' : 'Delete'}
          </button>
        </div>
      )}
    </div>
  );
}

function ClipboardCard({ item, onDelete, onSave }: { item: ClipboardItem, onDelete: (id: string) => void, onSave: (i: ClipboardItem) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onSave(item);
    }, 400); // Brief flash before routing to editor
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleting(true);
    setTimeout(() => onDelete(item.id), 300);
  };

  const dateStr = new Date(item.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  
  return (
    <div className={`saveable-card ${expanded ? 'expanded' : ''} ${deleting ? 'deleting' : ''}`} onClick={() => setExpanded(!expanded)}>
      <div className="card-header">
        <span className="timestamp">{dateStr}</span>
      </div>
      <div className="card-body">{item.text}</div>
      {expanded && (
        <div className="card-actions">
          <button className={copied ? 'success' : ''} onClick={handleCopy}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
          <button className={saved ? 'success' : ''} onClick={handleSave}>
            {saved ? '✓ Opening' : 'Save as Snippet'}
          </button>
          <button className="danger" onClick={handleDelete}>
            {deleting ? '...' : 'Delete'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>('MAIN');
  const [activeTab, setActiveTab] = useState<Tab>('snippets');
  const [searchQuery, setSearchQuery] = useState('');

  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [clipboard, setClipboard] = useState<ClipboardItem[]>([]);
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);
  
  const [varName, setVarName] = useState('');
  const [text, setText] = useState('');
  const [varType, setVarType] = useState('');
  const [customTypes, setCustomTypes] = useState<string[]>([]);
  
  const [activation, setActivation] = useState('//');
  const [initialActivation, setInitialActivation] = useState('//');
  const [activationError, setActivationError] = useState('');

  // Danger zone confirmation states
  const [confirmClearSnippets, setConfirmClearSnippets] = useState(false);
  const [confirmClearClipboard, setConfirmClearClipboard] = useState(false);

  useEffect(() => {
    loadData();
    getSetting('activationCommand', '//').then((val) => {
      setActivation(val);
      setInitialActivation(val);
    });
  }, []);

  const loadData = async () => {
    const snips = await getAllSnippets();
    setSnippets(snips);
    const clip = await getClipboardHistory();
    setClipboard(clip);
    const custom = await getSetting<string[]>('customSnippetTypes', []);
    setCustomTypes(custom);
  };

  const handleAdd = async () => {
    if (!varName.trim() || !text.trim()) return;
    
    const submittedType = varType.trim();
    let finalContent = text.trim();
    
    // Auto-format website strings
    if (submittedType === 'Website') {
      finalContent = 'www.' + finalContent.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
    }

    if (editingSnippet) {
      // Update existing
      await updateSnippet(editingSnippet.id, varName.trim(), finalContent, submittedType);
      setSnippets((prev) => prev.map(s => s.id === editingSnippet.id ? { ...s, variable: varName.trim(), text: finalContent, type: submittedType } : s));
    } else {
      // Create new
      const snippet = await addSnippet(varName.trim(), finalContent, submittedType);
      if (snippet) {
        setSnippets((prev) => [...prev, snippet]);
      }
    }
    
    // Check if new custom type
    if (submittedType && !DEFAULT_TYPES.includes(submittedType) && !customTypes.includes(submittedType)) {
      const newCustomTypes = [...customTypes, submittedType];
      setCustomTypes(newCustomTypes);
      await setSetting('customSnippetTypes', newCustomTypes);
    }
    
    setVarName('');
    setText('');
    setVarType('');
    setEditingSnippet(null);
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

  const handleEditSnippet = (snippet: Snippet) => {
    setEditingSnippet(snippet);
    setVarName(snippet.variable);
    setText(snippet.text);
    setVarType(snippet.type || '');
    setView('EDITOR');
  };

  const handleSaveClipboardItem = (item: ClipboardItem) => {
    setEditingSnippet(null);
    setVarName('');
    setVarType('');
    setText(item.text); // pre-fill the text
    setView('EDITOR');
  };

  const handleClearSnippets = async () => {
    if (!confirmClearSnippets) {
      setConfirmClearSnippets(true);
      setTimeout(() => setConfirmClearSnippets(false), 3000);
      return;
    }
    // Delete all strings iteratively since clearObjectStore isn't built yet, or clear from db
    for (const s of snippets) {
      await deleteSnippet(s.id);
    }
    setSnippets([]);
    setConfirmClearSnippets(false);
  };

  const handleClearClipboard = async () => {
    if (!confirmClearClipboard) {
      setConfirmClearClipboard(true);
      setTimeout(() => setConfirmClearClipboard(false), 3000);
      return;
    }
    await clearClipboardHistory();
    setClipboard([]);
    setConfirmClearClipboard(false);
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

  const renderSettings = () => (
    <div className="settings-panel">
      <div className="view-header">
        <h2>Settings</h2>
        <button className="back-btn" onClick={() => setView('MAIN')}>← Back</button>
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

  const renderEditor = () => {
    const isEdit = !!editingSnippet;
    
    return (
      <div className="editor-view">
        <div className="view-header">
          <h2>{isEdit ? 'Edit Snippet' : 'New Snippet'}</h2>
          <button className="back-btn" onClick={() => {
            setView('MAIN');
            setEditingSnippet(null);
            setVarName('');
            setText('');
            setVarType('');
          }}>
            ← Cancel
          </button>
        </div>
        <div className="editor-form">
          <label>Variable Name</label>
          <input
            className="var-input"
            placeholder="e.g. em"
            value={varName}
            onChange={(e) => setVarName(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <label>Type (Optional)</label>
          <input
            list="snippet-types"
            className="type-input"
            placeholder="e.g. Email"
            value={varType}
            onChange={(e) => setVarType(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <datalist id="snippet-types">
            {[...DEFAULT_TYPES, ...customTypes].map(t => <option key={t} value={t} />)}
          </datalist>
          <label>Text Content</label>
          {varType === 'Phone Number' ? (
            <input
              type="tel"
              className="text-input"
              placeholder="e.g. 555-0100"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          ) : varType === 'Email' ? (
            <input
              type="email"
              className="text-input"
              placeholder="e.g. name@example.com"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          ) : varType === 'Website' ? (
            <div className="website-input-wrapper">
              <span className="website-prefix">www.</span>
              <input
                type="text"
                className="text-input website-input"
                placeholder="example.com"
                value={text.replace(/^https?:\/\//i, '').replace(/^www\./i, '')}
                onChange={(e) => {
                  let val = e.target.value;
                  val = val.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
                  setText(val);
                }}
                onKeyDown={handleKeyDown}
              />
            </div>
          ) : (
            <textarea
              className="text-input"
              placeholder="Text to expand..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          )}
          <button className="save-btn" onClick={handleAdd} disabled={!varName.trim() || !text.trim()}>
            Save Snippet
          </button>
        </div>
      </div>
    );
  };

  const renderSnippets = () => {
    const filtered = snippets.filter(s => 
      s.variable.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.text.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="card-list">
        {snippets.length === 0 ? (
          <div className="empty">No snippets yet. Click + to add one.</div>
        ) : filtered.length === 0 ? (
          <div className="empty">No snippets match your search.</div>
        ) : (
          filtered.map((s) => (
            <SnippetCard 
              key={s.id} 
              snippet={s} 
              onDelete={handleDeleteSnippet} 
              onEdit={handleEditSnippet} 
            />
          ))
        )}
      </div>
    );
  };

  const renderClipboard = () => {
    const filtered = clipboard.filter(c => 
      c.text.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="card-list">
        {clipboard.length === 0 ? (
          <div className="empty">Your clipboard history is empty. Copy some text!</div>
        ) : filtered.length === 0 ? (
          <div className="empty">No clips match your search.</div>
        ) : (
          filtered.map((c) => (
            <ClipboardCard 
              key={c.id} 
              item={c} 
              onDelete={handleDeleteClipboard} 
              onSave={handleSaveClipboardItem} 
            />
          ))
        )}
      </div>
    );
  };

  const renderMain = () => (
    <div className="main-view">
      <div className="tabs-header">
        <div className="tabs">
          <button className={`tab ${activeTab === 'snippets' ? 'active' : ''}`} onClick={() => setActiveTab('snippets')}>
            Snippets
          </button>
          <button className={`tab ${activeTab === 'clipboard' ? 'active' : ''}`} onClick={() => setActiveTab('clipboard')}>
            History
          </button>
        </div>
        
        {activeTab === 'snippets' && (
          <button className="fab-btn" onClick={() => setView('EDITOR')}>+ Add Snippet</button>
        )}
      </div>

      <div className="tab-content">
        {activeTab === 'snippets' ? renderSnippets() : renderClipboard()}
      </div>
    </div>
  );

  return (
    <div className="app">
      {view === 'MAIN' && (
        <div className="header">
          <h1>TypeOnce</h1>
          <input 
            className="search-bar" 
            placeholder="Search..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <button 
            className="settings-toggle" 
            onClick={() => setView('SETTINGS')}
            title="Settings"
          >
            ⚙️
          </button>
        </div>
      )}

      <div className="view-container">
        {view === 'SETTINGS' && renderSettings()}
        {view === 'EDITOR' && renderEditor()}
        {view === 'MAIN' && renderMain()}
      </div>
    </div>
  );
}
