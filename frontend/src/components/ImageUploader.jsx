import { useRef, useState } from 'react';
import { Upload, Loader2, X, ImageIcon, Link2 } from 'lucide-react';
import { api } from '../api/client';

export default function ImageUploader({ value, onChange, label = 'Service image', compact = true }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [showUrl, setShowUrl] = useState(false);

  const pick = () => ref.current?.click();

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setErr('File too large (max 4 MB).');
      return;
    }
    setBusy(true); setErr('');
    try {
      const d = await api.upload('/uploads', file);
      onChange?.(d.url);
    } catch (e) {
      setErr(e.message || 'Upload failed');
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = '';
    }
  };

  // Compact horizontal layout: 88px tall, thumb on the left, actions right.
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wide text-ink-600 mb-1">{label}</label>
      <div className="flex items-stretch gap-3 rounded-xl border border-ink-200 bg-white p-2">
        {/* Thumb / placeholder */}
        <button
          type="button"
          onClick={pick}
          className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden border border-ink-200 bg-ink-50 hover:border-brand-400 transition group"
        >
          {value ? (
            <>
              <img src={value} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[10px] font-semibold">
                Replace
              </div>
            </>
          ) : busy ? (
            <Loader2 size={20} className="absolute inset-0 m-auto animate-spin text-brand-600" />
          ) : (
            <ImageIcon size={20} className="absolute inset-0 m-auto text-ink-400" />
          )}
        </button>

        {/* Right column — actions + (optional) URL field */}
        <div className="flex-1 flex flex-col justify-between min-w-0">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={pick} disabled={busy}
              className="btn-outline !py-1.5 !px-3 text-xs">
              <Upload size={12} /> {value ? 'Replace' : 'Upload'}
            </button>
            {value && (
              <button type="button" onClick={() => onChange?.('')}
                className="btn-ghost !py-1.5 !px-3 text-xs text-rose-600 hover:bg-rose-50">
                <X size={12} /> Remove
              </button>
            )}
            <button type="button" onClick={() => setShowUrl((v) => !v)}
              className="btn-ghost !py-1.5 !px-3 text-xs">
              <Link2 size={12} /> {showUrl ? 'Hide URL' : 'Paste URL'}
            </button>
          </div>
          <div className="text-[11px] text-ink-500 truncate">
            {value
              ? value.startsWith('/uploads/') ? `Uploaded · ${value.split('/').pop()}` : value
              : 'PNG/JPG/WebP · up to 4 MB'}
          </div>
        </div>
      </div>

      {showUrl && (
        <input
          type="text"
          placeholder="https://… (paste an image URL)"
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          className="w-full mt-2 px-3 py-2 rounded-lg border border-ink-200 bg-white text-sm placeholder-ink-400 outline-none focus:ring-4 focus:ring-brand-100 focus:border-brand-400"
        />
      )}
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={onFile} />
      {err && <div className="text-[11px] text-rose-600 mt-1">{err}</div>}
    </div>
  );
}
