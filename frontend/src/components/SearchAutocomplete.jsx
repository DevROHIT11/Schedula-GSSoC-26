import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Clock, MapPin, ArrowUpRight } from 'lucide-react';
import { api } from '../api/client';

// Highlight every occurrence of `q` inside `text` (case-insensitive).
function highlight(text, q) {
  if (!q) return text;
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig');
  const parts = String(text || '').split(re);
  return parts.map((p, i) =>
    re.test(p) ? <mark key={i} className="bg-accent-100 text-accent-800 rounded px-0.5">{p}</mark> : p
  );
}

export default function SearchAutocomplete() {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [recent, setRecent] = useState(() => {
    try { return JSON.parse(localStorage.getItem('schedula:recent_searches') || '[]'); }
    catch { return []; }
  });
  const seq = useRef(0);
  const wrap = useRef(null);

  useEffect(() => {
    const close = (e) => { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) { setItems([]); return; }
    const my = ++seq.current;
    const t = setTimeout(() => {
      api.get(`/services/search?q=${encodeURIComponent(q.trim())}`)
        .then((d) => { if (my === seq.current) setItems((d.services || []).slice(0, 6)); })
        .catch(() => { if (my === seq.current) setItems([]); });
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  const goSearch = (term) => {
    const v = (term ?? q).trim();
    if (!v) return;
    const next = [v, ...recent.filter((r) => r !== v)].slice(0, 5);
    setRecent(next);
    localStorage.setItem('schedula:recent_searches', JSON.stringify(next));
    setOpen(false);
    nav(`/search?q=${encodeURIComponent(v)}`);
  };

  const goService = (s) => {
    setOpen(false);
    nav(`/book/${s.id}`);
  };

  const onKey = (e) => {
    const max = (q.trim().length >= 2 ? items.length : recent.length);
    if (!open) setOpen(true);
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(max - 1, a + 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive((a) => Math.max(-1, a - 1)); }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (active >= 0 && q.trim().length >= 2 && items[active]) goService(items[active]);
      else if (active >= 0 && q.trim().length < 2 && recent[active]) goSearch(recent[active]);
      else goSearch();
    }
    if (e.key === 'Escape') setOpen(false);
  };

  const showRecent = open && q.trim().length < 2 && recent.length > 0;
  const showResults = open && q.trim().length >= 2;

  return (
    <div ref={wrap} className="relative flex-1 max-w-xl">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
      <input
        className="input !pl-9"
        placeholder="Search services, providers, cities…"
        value={q}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQ(e.target.value); setActive(-1); setOpen(true); }}
        onKeyDown={onKey}
      />

      {(showResults || showRecent) && (
        <div className="absolute left-0 right-0 mt-2 card overflow-hidden z-40 animate-fade-in">
          {showRecent && (
            <>
              <div className="px-3 py-2 text-[10px] uppercase tracking-wide font-semibold text-ink-400 bg-ink-50 border-b border-ink-200">Recent</div>
              {recent.map((r, i) => (
                <button key={r}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => goSearch(r)}
                  className={`w-full px-3 py-2 flex items-center gap-2 text-sm text-left hover:bg-ink-50 ${active === i ? 'bg-ink-50' : ''}`}>
                  <Clock size={14} className="text-ink-400" />
                  <span>{r}</span>
                </button>
              ))}
            </>
          )}

          {showResults && items.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-ink-500">No matches for <b>"{q}"</b></div>
          )}

          {showResults && items.length > 0 && (
            <>
              <div className="px-3 py-2 text-[10px] uppercase tracking-wide font-semibold text-ink-400 bg-ink-50 border-b border-ink-200">Suggestions</div>
              {items.map((s, i) => (
                <button key={s.id}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => goService(s)}
                  className={`w-full px-3 py-2.5 flex items-center gap-3 text-left hover:bg-ink-50 ${active === i ? 'bg-ink-50' : ''}`}>
                  {s.image_url
                    ? <img src={s.image_url} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                    : <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: s.category_color || '#6366f1' }}>{(s.name || '?')[0]}</div>}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ink-900 truncate">{highlight(s.name, q)}</div>
                    <div className="text-xs text-ink-500 truncate flex items-center gap-1.5">
                      {s.category_name && <span>{s.category_name}</span>}
                      {s.city && <><span>·</span><MapPin size={10} /> {highlight(s.city, q)}</>}
                      <span>·</span>
                      <span className="font-semibold text-ink-700">₹{Number(s.price || 0).toFixed(0)}</span>
                    </div>
                  </div>
                  <ArrowUpRight size={14} className="text-ink-400 flex-shrink-0" />
                </button>
              ))}
              <button onClick={() => goSearch()}
                className="w-full px-3 py-2.5 text-xs text-ink-900 bg-ink-100 hover:bg-ink-200 font-semibold border-t border-ink-200">
                See all results for "{q}" →
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
