import { useState } from 'react';
import type { ClipboardItem } from '../../../lib/db';

interface ClipboardCardProps {
  item: ClipboardItem;
  onDelete: (id: string) => void;
  onSave: (i: ClipboardItem) => void;
}

export function ClipboardCard({ item, onDelete, onSave }: ClipboardCardProps) {
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
    }, 400);
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
