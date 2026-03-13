import { useState } from 'react';
import { addSnippet, updateSnippet, getSetting, setSetting, type Snippet } from '../../../lib/db';
import { getSessionKey } from '../../../lib/session';

const DEFAULT_TYPES = ['Phone Number', 'Email', 'Address', 'Website'];

interface EditorViewProps {
  editingSnippet: Snippet | null;
  initialText: string;
  customTypes: string[];
  onSaved: (snippet: Snippet, isEdit: boolean) => void;
  onCustomTypeAdded: (types: string[]) => void;
  onCancel: () => void;
}

async function activeKey(): Promise<CryptoKey | undefined> {
  const enabled = await getSetting('encryptionEnabled', false);
  if (!enabled) return undefined;
  return (await getSessionKey()) ?? undefined;
}

export function EditorView({
  editingSnippet,
  initialText,
  customTypes,
  onSaved,
  onCustomTypeAdded,
  onCancel,
}: EditorViewProps) {
  const [varName, setVarName] = useState(editingSnippet?.variable ?? '');
  const [varError, setVarError] = useState('');
  const [text, setText] = useState(editingSnippet?.text ?? initialText);
  const [varType, setVarType] = useState(editingSnippet?.type ?? '');

  const isEdit = !!editingSnippet;

  const handleSave = async () => {
    if (!varName.trim() || !text.trim()) return;
    if (varName.trim().toLowerCase() === 'paste') {
      setVarError('"paste" is a reserved keyword and cannot be used as a variable name.');
      return;
    }
    setVarError('');

    const submittedType = varType.trim();
    let finalContent = text.trim();

    if (submittedType === 'Website') {
      finalContent = 'www.' + finalContent.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
    }

    const key = await activeKey();

    if (editingSnippet) {
      await updateSnippet(editingSnippet.id, varName.trim(), finalContent, submittedType, key);
      onSaved(
        { ...editingSnippet, variable: varName.trim(), text: finalContent, type: submittedType },
        true,
      );
    } else {
      const snippet = await addSnippet(varName.trim(), finalContent, submittedType, key);
      if (snippet) {
        onSaved(snippet, false);
      }
    }

    if (submittedType && !DEFAULT_TYPES.includes(submittedType) && !customTypes.includes(submittedType)) {
      const newCustomTypes = [...customTypes, submittedType];
      onCustomTypeAdded(newCustomTypes);
      await setSetting('customSnippetTypes', newCustomTypes);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
  };

  return (
    <div className="editor-view">
      <div className="view-header">
        <h2>{isEdit ? 'Edit Snippet' : 'New Snippet'}</h2>
        <button className="back-btn" onClick={onCancel}>← Cancel</button>
      </div>
      <div className="editor-form">
        <label>Variable Name</label>
        <input
          className="var-input"
          placeholder="e.g. em"
          value={varName}
          onChange={(e) => { setVarName(e.target.value); setVarError(''); }}
          onKeyDown={handleKeyDown}
        />
        {varError && <span className="error-text">{varError}</span>}
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
          {[...DEFAULT_TYPES, ...customTypes].map((t) => <option key={t} value={t} />)}
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
        <button className="save-btn" onClick={handleSave} disabled={!varName.trim() || !text.trim()}>
          Save Snippet
        </button>
      </div>
    </div>
  );
}
