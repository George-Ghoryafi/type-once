import { useState, useEffect } from 'react';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ── Step 1: Snippet Expansion ─────────────────────────────────────────────────

function StepExpansion() {
  const [text, setText] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showTab, setShowTab] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const TYPED = '//em';
    const RESULT = 'george@example.com';

    const run = async () => {
      while (!cancelled) {
        setText('');
        setShowDropdown(false);
        setShowTab(false);
        setExpanded(false);
        await sleep(800);
        if (cancelled) return;

        for (let i = 1; i <= TYPED.length; i++) {
          if (cancelled) return;
          setText(TYPED.slice(0, i));
          await sleep(i <= 2 ? 90 : 150);
        }

        if (cancelled) return;
        setShowDropdown(true);
        await sleep(950);
        if (cancelled) return;
        setShowTab(true);
        await sleep(750);
        if (cancelled) return;

        setShowDropdown(false);
        setShowTab(false);
        setExpanded(true);
        setText(RESULT);
        await sleep(2400);
        if (cancelled) return;
      }
    };

    run();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="ob-step">
      <div className="ob-step-icon">⚡</div>
      <h2 className="ob-title">Expand snippets instantly</h2>
      <p className="ob-subtitle">
        Type your activation code followed by a shorthand. Press{' '}
        <kbd className="ob-key">Tab</kbd> or click to expand.
      </p>
      <div className="ob-demo">
        <div className={`ob-mock-field ${expanded ? 'ob-mock-field--success' : ''}`}>
          <span className="ob-field-text">
            {text
              ? <span className={expanded ? 'ob-expanded-text' : ''}>{text}</span>
              : <span className="ob-placeholder">Start typing…</span>
            }
          </span>
          {!expanded && <span className="ob-cursor" />}
        </div>
        {showDropdown && (
          <div className="ob-mock-dropdown">
            <div className="ob-mock-item ob-mock-item--active">
              <span className="ob-mock-var">em</span>
              <span className="ob-mock-arrow">→</span>
              <span className="ob-mock-preview">george@example.com</span>
              {showTab && <kbd className="ob-tab-badge">Tab ↵</kbd>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Step 2: Clipboard History ─────────────────────────────────────────────────

const BASE_CLIPS = [
  { id: 'b', text: 'npm install @types/node --save-dev', time: 'Yesterday' },
  { id: 'c', text: 'https://github.com/typeonce/app', time: '2d ago' },
];

function StepClipboard() {
  const [items, setItems] = useState(BASE_CLIPS);
  const [incoming, setIncoming] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const NEW = { id: 'a', text: 'george@example.com', time: 'Just now' };

    const run = async () => {
      while (!cancelled) {
        setItems(BASE_CLIPS);
        setIncoming(false);
        await sleep(1000);
        if (cancelled) return;

        setIncoming(true);
        await sleep(750);
        if (cancelled) return;

        setIncoming(false);
        setItems([NEW, ...BASE_CLIPS]);
        await sleep(2800);
        if (cancelled) return;
      }
    };

    run();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="ob-step">
      <div className="ob-step-icon">📋</div>
      <h2 className="ob-title">Your clipboard, remembered</h2>
      <p className="ob-subtitle">
        Every text you copy is saved automatically. Access your full history anytime.
      </p>
      <div className="ob-demo">
        {incoming && (
          <div className="ob-copy-flash">
            <span className="ob-copy-pulse" />
            Saving to history…
          </div>
        )}
        <div className="ob-mock-card-list">
          {items.map((item, i) => (
            <div
              key={item.id}
              className={`ob-mock-card ${i === 0 && item.id === 'a' ? 'ob-mock-card--new' : ''}`}
            >
              <span className="ob-mock-card-time">{item.time}</span>
              <span className="ob-mock-card-text">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Step 3: //paste Bypass ────────────────────────────────────────────────────

function StepPaste() {
  const [text, setText] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showTab, setShowTab] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const TYPED = '//paste';
    const RESULT = 'george@example.com';

    const run = async () => {
      while (!cancelled) {
        setText('');
        setBlocked(false);
        setShowDropdown(false);
        setShowTab(false);
        setExpanded(false);
        await sleep(700);
        if (cancelled) return;

        setBlocked(true);
        await sleep(1100);
        if (cancelled) return;
        setBlocked(false);
        await sleep(450);
        if (cancelled) return;

        for (let i = 1; i <= TYPED.length; i++) {
          if (cancelled) return;
          setText(TYPED.slice(0, i));
          if (i === 2) setShowDropdown(true);
          await sleep(140);
        }

        await sleep(900);
        if (cancelled) return;
        setShowTab(true);
        await sleep(700);
        if (cancelled) return;

        setShowDropdown(false);
        setShowTab(false);
        setExpanded(true);
        setText(RESULT);
        await sleep(2500);
        if (cancelled) return;
      }
    };

    run();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="ob-step">
      <div className="ob-step-icon">📌</div>
      <h2 className="ob-title">Bypass paste restrictions</h2>
      <p className="ob-subtitle">
        Some fields block pasting. Use{' '}
        <code className="ob-inline-code">//paste</code> to inject your latest
        clipboard item anywhere.
      </p>
      <div className="ob-demo">
        <div className="ob-field-label-row">
          <span className="ob-field-label-text">Restricted input</span>
          <span className="ob-paste-badge">⊘ paste disabled</span>
        </div>
        <div
          className={[
            'ob-mock-field',
            blocked ? 'ob-mock-field--blocked' : '',
            expanded ? 'ob-mock-field--success' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className="ob-field-text">
            {blocked ? (
              <span className="ob-blocked-text">⊘ Paste not allowed</span>
            ) : text ? (
              <span className={expanded ? 'ob-expanded-text' : ''}>{text}</span>
            ) : (
              <span className="ob-placeholder">Type here…</span>
            )}
          </span>
          {!blocked && !expanded && <span className="ob-cursor" />}
        </div>
        {showDropdown && (
          <div className="ob-mock-dropdown">
            <div className="ob-mock-item ob-mock-item--active ob-mock-item--paste">
              <span className="ob-mock-var ob-mock-var--paste">paste</span>
              <span className="ob-mock-arrow">→</span>
              <span className="ob-mock-preview">george@example.com</span>
              {showTab && <kbd className="ob-tab-badge">Tab ↵</kbd>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Step 4: Encryption ────────────────────────────────────────────────────────

const ENC_ROWS = [
  { key: 'em', plain: 'george@example.com', enc: 'dGhpcyBpcyBlbmNye…' },
  { key: 'ph', plain: '+1 (555) 010-0100', enc: 'aGVsbG8gd29ybGQg…' },
  { key: 'addr', plain: '123 Main St, NY', enc: 'YmFzZTY0IGVuY3J5…' },
];

function StepEncryption() {
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      while (!cancelled) {
        setLocked(false);
        await sleep(1200);
        if (cancelled) return;
        setLocked(true);
        await sleep(3000);
        if (cancelled) return;
      }
    };
    run();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="ob-step">
      <div className="ob-step-icon">🔒</div>
      <h2 className="ob-title">Keep your data private</h2>
      <p className="ob-subtitle">
        Enable AES-256 password encryption in Settings to protect your snippets
        at rest.
      </p>
      <div className="ob-demo ob-enc-demo">
        <div className={`ob-enc-status ${locked ? 'ob-enc-status--on' : 'ob-enc-status--off'}`}>
          {locked ? '🔒 Encrypted' : '🔓 Unencrypted'}
        </div>
        <div className="ob-enc-table">
          {ENC_ROWS.map((row) => (
            <div key={row.key} className="ob-enc-row">
              <span className="ob-enc-var">{row.key}</span>
              <span className="ob-enc-sep">→</span>
              <span className={`ob-enc-val ${locked ? 'ob-enc-val--on' : ''}`}>
                {locked ? row.enc : row.plain}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Onboarding ───────────────────────────────────────────────────────────

const TOTAL_STEPS = 4;

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);

  return (
    <div className="ob-container">
      <button className="ob-skip-btn" onClick={onComplete}>
        Skip
      </button>

      <div className="ob-steps-wrap">
        {step === 0 && <StepExpansion key="expansion" />}
        {step === 1 && <StepClipboard key="clipboard" />}
        {step === 2 && <StepPaste key="paste" />}
        {step === 3 && <StepEncryption key="encryption" />}
      </div>

      <div className="ob-footer">
        <div className="ob-dots">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <button
              key={i}
              className={`ob-dot ${i === step ? 'ob-dot--active' : ''}`}
              onClick={() => setStep(i)}
            />
          ))}
        </div>
        <div className="ob-nav">
          {step > 0 && (
            <button className="ob-back-btn" onClick={() => setStep((s) => s - 1)}>
              ← Back
            </button>
          )}
          {step < TOTAL_STEPS - 1 ? (
            <button className="ob-next-btn" onClick={() => setStep((s) => s + 1)}>
              Next →
            </button>
          ) : (
            <button className="ob-next-btn ob-next-btn--finish" onClick={onComplete}>
              Get Started →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
