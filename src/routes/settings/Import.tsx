/**
 * Imported Soul: paste/upload the Shift + Lift localStorage export, absorb it as one
 * `history_imported` event. Re-imports are harmless (content-hash source + upsert
 * expansion), so there is no scary "are you sure" — the worst case is a no-op.
 */
import { useState } from 'react';
import { SYSTEM } from '../../data/strings';
import { appendEvent } from '../../store/append';
import { parseShiftLiftExport } from '../../store/importShiftLift';
import { requestSync } from '../../store/sync';
import { SystemWindow } from '../../ui/SystemWindow';

export function Import() {
  const [text, setText] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const absorb = (raw: string) => {
    try {
      const payload = parseShiftLiftExport(raw);
      void appendEvent('history_imported', payload).then(() => {
        setNotice(SYSTEM.settings.imported(payload.entries.length));
        setText('');
        void requestSync('import');
      });
    } catch (err) {
      setNotice(String((err as Error).message).toUpperCase());
    }
  };

  return (
    <SystemWindow label={SYSTEM.settings.importLabel}>
      <p className="intel-line system-text system-text--muted">{SYSTEM.settings.importHint}</p>
      <textarea
        className="field field--area"
        placeholder={SYSTEM.settings.importPlaceholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
      />
      <input
        type="file"
        accept="application/json,.json,.txt"
        className="file-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void file.text().then(absorb);
          e.target.value = '';
        }}
      />
      <button className="cta" disabled={text.trim().length === 0} onClick={() => absorb(text)}>
        {SYSTEM.settings.importBtn}
      </button>
      {notice && <p className="intel-line system-text">{notice}</p>}
    </SystemWindow>
  );
}
