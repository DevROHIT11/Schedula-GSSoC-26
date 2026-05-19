import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastCtx = createContext({ push: () => {} });

const ICON = {
  success: CheckCircle2,
  error:   XCircle,
  info:    Info,
  warn:    AlertTriangle,
};
const ACCENT = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  error:   'bg-rose-50 border-rose-200 text-rose-800',
  info:    'bg-brand-50 border-brand-200 text-brand-800',
  warn:    'bg-amber-50 border-amber-200 text-amber-800',
};

let _id = 0;

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);

  const dismiss = useCallback((id) => setItems((arr) => arr.filter((t) => t.id !== id)), []);

  const push = useCallback((opts) => {
    const id = ++_id;
    const t = { id, kind: 'info', ttl: 4000, ...(typeof opts === 'string' ? { text: opts } : opts) };
    setItems((arr) => [...arr, t]);
    if (t.ttl > 0) setTimeout(() => dismiss(id), t.ttl);
    return id;
  }, [dismiss]);

  return (
    <ToastCtx.Provider value={{ push, dismiss }}>
      {children}
      <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 w-[min(360px,calc(100vw-2rem))] pointer-events-none">
        {items.map((t) => {
          const Icon = ICON[t.kind] || Info;
          return (
            <div key={t.id}
              role="status"
              className={`pointer-events-auto card border ${ACCENT[t.kind] || ACCENT.info} px-3 py-2.5 flex items-start gap-2.5 shadow-lg animate-slide-up`}
            >
              <Icon size={16} className="mt-0.5 flex-shrink-0" />
              <div className="flex-1 text-sm leading-snug">
                {t.title && <div className="font-semibold">{t.title}</div>}
                <div className={t.title ? 'text-xs opacity-90 mt-0.5' : ''}>{t.text}</div>
              </div>
              <button onClick={() => dismiss(t.id)} className="opacity-60 hover:opacity-100 -mr-1 -mt-0.5 p-1">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
