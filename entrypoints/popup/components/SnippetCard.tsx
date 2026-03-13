import { useState } from 'react';
import type { Snippet } from '../../../lib/db';

interface SnippetCardProps {
  snippet: Snippet;
  onDelete: (id: string) => void;
  onEdit: (s: Snippet) => void;
}

export function SnippetCard({ snippet, onDelete, onEdit }: SnippetCardProps) {
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
    setTimeout(() => onDelete(snippet.id), 300);
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
