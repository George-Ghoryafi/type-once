import { useState, useEffect } from 'react';
import { getAllSnippets, addSnippet, deleteSnippet, type Snippet } from '../../lib/db';
import './App.css';

export default function App() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [varName, setVarName] = useState('');
  const [text, setText] = useState('');

  useEffect(() => {
    getAllSnippets().then(setSnippets);
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

  return (
    <div className="app">
      <div className="header">
        <h1>TypeOnce</h1>
        <span className="tag">// to expand</span>
      </div>

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
            No snippets yet. Add one above, then type <code>//</code> in any input to expand.
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
