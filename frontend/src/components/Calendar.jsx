import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEKDAY_LABELS = ['S','M','T','W','T','F','S'];

const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function Calendar({ value, onChange, blockedDates = [], notes = [], minDate, maxDate }) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const init = value ? new Date(value + 'T00:00:00') : today;
  const [view, setView] = useState({ y: init.getFullYear(), m: init.getMonth() });

  const firstDay = new Date(view.y, view.m, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();

  const blockedSet = new Set(blockedDates);
  const noteMap = {};
  for (const n of notes) noteMap[n.note_date] = n;

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const min = minDate ? new Date(minDate + 'T00:00:00') : today;
  const max = maxDate ? new Date(maxDate + 'T00:00:00') : null;

  const prev = () => setView((v) => v.m === 0 ? { y: v.y - 1, m: 11 } : { ...v, m: v.m - 1 });
  const next = () => setView((v) => v.m === 11 ? { y: v.y + 1, m: 0 } : { ...v, m: v.m + 1 });

  return (
    <div className="card p-4 select-none">
      <div className="flex items-center justify-between mb-3">
        <button onClick={prev} className="p-1.5 rounded-lg hover:bg-ink-100"><ChevronLeft size={18} /></button>
        <div className="font-semibold text-ink-900">{MONTH_NAMES[view.m]} {view.y}</div>
        <button onClick={next} className="p-1.5 rounded-lg hover:bg-ink-100"><ChevronRight size={18} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-ink-400 mb-1">
        {WEEKDAY_LABELS.map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const dt = new Date(view.y, view.m, d);
          const key = fmt(dt);
          const disabled = dt < min || (max && dt > max) || blockedSet.has(key);
          const selected = key === value;
          const note = noteMap[key];
          return (
            <button
              key={i}
              disabled={disabled}
              onClick={() => onChange(key)}
              title={note ? note.note : undefined}
              className={`aspect-square rounded-lg text-sm font-medium relative transition
                ${selected ? 'bg-brand-600 text-white shadow-soft' : ''}
                ${!selected && !disabled ? 'hover:bg-brand-50 text-ink-800' : ''}
                ${disabled ? 'text-ink-300 cursor-not-allowed' : ''}
              `}
            >
              {d}
              {note && !selected && <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
