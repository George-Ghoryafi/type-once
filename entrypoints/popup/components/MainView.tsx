import { useState } from 'react';
import type { Snippet, ClipboardItem } from '../../../lib/db';
import { SnippetCard } from './SnippetCard';
import { ClipboardCard } from './ClipboardCard';

type Tab = 'snippets' | 'clipboard';

interface MainViewProps {
  snippets: Snippet[];
  clipboard: ClipboardItem[];
  searchQuery: string;
  onDeleteSnippet: (id: string) => void;
  onEditSnippet: (s: Snippet) => void;
  onDeleteClipboard: (id: string) => void;
  onSaveClipboard: (item: ClipboardItem) => void;
  onAddSnippet: () => void;
}

export function MainView({
  snippets,
  clipboard,
  searchQuery,
  onDeleteSnippet,
  onEditSnippet,
  onDeleteClipboard,
  onSaveClipboard,
  onAddSnippet,
}: MainViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>('snippets');

  const filteredSnippets = snippets.filter((s) =>
    s.variable.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.text.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredClipboard = clipboard.filter((c) =>
    c.text.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
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
          <button className="fab-btn" onClick={onAddSnippet}>+ Add Snippet</button>
        )}
      </div>
      <div className="tab-content">
        {activeTab === 'snippets' ? (
          <div className="card-list">
            {snippets.length === 0 ? (
              <div className="empty">No snippets yet. Click + to add one.</div>
            ) : filteredSnippets.length === 0 ? (
              <div className="empty">No snippets match your search.</div>
            ) : (
              filteredSnippets.map((s) => (
                <SnippetCard key={s.id} snippet={s} onDelete={onDeleteSnippet} onEdit={onEditSnippet} />
              ))
            )}
          </div>
        ) : (
          <div className="card-list">
            {clipboard.length === 0 ? (
              <div className="empty">Your clipboard history is empty. Copy some text!</div>
            ) : filteredClipboard.length === 0 ? (
              <div className="empty">No clips match your search.</div>
            ) : (
              filteredClipboard.map((c) => (
                <ClipboardCard key={c.id} item={c} onDelete={onDeleteClipboard} onSave={onSaveClipboard} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
