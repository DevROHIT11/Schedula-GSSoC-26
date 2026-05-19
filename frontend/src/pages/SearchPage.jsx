import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, X } from 'lucide-react';
import { api } from '../api/client';
import ServiceCard from '../components/ServiceCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function SearchPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const initial = params.get('q') || '';
  const [query, setQuery] = useState(initial);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedIds, setSavedIds] = useState(new Set());
  const seq = useRef(0);

  useEffect(() => {
    if (user) api.get('/saved/ids').then((d) => setSavedIds(new Set(d.ids || []))).catch(() => {});
  }, [user]);

  // Debounce search 250ms.
  useEffect(() => {
    const q = query.trim();
    setParams(q ? { q } : {}, { replace: true });
    if (!q) { setResults([]); setLoading(false); return; }
    setLoading(true); setError('');
    const my = ++seq.current;
    const t = setTimeout(() => {
      api.get(`/services/search?q=${encodeURIComponent(q)}`)
        .then((d) => { if (my === seq.current) setResults(d.services || []); })
        .catch((e) => { if (my === seq.current) setError(e.message); })
        .finally(() => { if (my === seq.current) setLoading(false); });
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const onToggleSaved = (id, saved) => {
    setSavedIds((prev) => { const next = new Set(prev); if (saved) next.add(id); else next.delete(id); return next; });
  };

  return (
    <div className="space-y-6">
      <button onClick={() => nav(-1)} className="btn-ghost"><ChevronLeft size={16} /> Back</button>

      <div>
        <span className="eyebrow">Search</span>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink-900 mt-2 tracking-tightest">Find your next slot.</h1>
        <p className="text-ink-500 mt-2 text-sm sm:text-base max-w-xl">Search by service, category, city or organiser. Results update as you type.</p>
      </div>

      <div className="card p-2 flex items-center gap-2">
        <Search size={18} className="ml-3 text-ink-400 flex-shrink-0" />
        <input
          autoFocus
          className="flex-1 bg-transparent border-0 outline-none px-2 py-3 text-base placeholder-ink-400"
          placeholder="Try “dentist near me”, “career coach”, “yoga class”…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button onClick={() => setQuery('')} className="btn-ghost !p-2"><X size={14} /></button>
        )}
      </div>

      {error && <div className="card border-rose-200 bg-rose-50 text-rose-700 p-3 text-sm">{error}</div>}

      {!query && (
        <div className="card p-14 text-center">
          <div className="w-14 h-14 rounded-full bg-ink-100 mx-auto flex items-center justify-center text-ink-400">
            <Search size={22} />
          </div>
          <p className="text-sm text-ink-500 mt-4 max-w-md mx-auto">Type at least one character to search across services, categories and cities.</p>
        </div>
      )}

      {query && loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card overflow-hidden">
              <div className="aspect-[16/10] shimmer-bg" />
              <div className="p-4 space-y-2">
                <div className="h-4 shimmer-bg w-2/3" />
                <div className="h-3 shimmer-bg w-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {query && !loading && !results.length && !error && (
        <div className="card p-14 text-center">
          <div className="w-14 h-14 rounded-full bg-ink-100 mx-auto flex items-center justify-center text-2xl">🔍</div>
          <h3 className="font-display text-xl font-semibold text-ink-900 mt-4 tracking-crisp">No services for "{query}"</h3>
          <p className="text-sm text-ink-500 mt-2 mb-5 max-w-md mx-auto">Try a different keyword, broaden the city, or jump back to a category.</p>
          <Link to="/" className="btn-primary inline-flex">Browse all categories</Link>
        </div>
      )}

      {query && !loading && results.length > 0 && (
        <>
          <div className="text-sm text-ink-500">
            <span className="font-display font-semibold text-ink-900">{results.length}</span> result{results.length !== 1 ? 's' : ''} for <span className="text-ink-800 font-medium">"{query}"</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {results.map((s) => (
              <ServiceCard key={s.id} service={s} savedIds={savedIds} onToggleSaved={onToggleSaved} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
