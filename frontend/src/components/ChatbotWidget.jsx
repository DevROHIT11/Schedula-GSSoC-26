import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Sparkles } from 'lucide-react';
import { api } from '../api/client';

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const scroller = useRef(null);

  useEffect(() => {
    if (!open) return;
    api.get('/chat/history')
      .then((d) => setMsgs(d.messages || []))
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [msgs, open]);

  const send = async () => {
    const q = text.trim();
    if (!q) return;
    setText('');
    setMsgs((m) => [...m, { id: 'u' + Date.now(), role: 'user', text: q }]);
    setBusy(true);
    try {
      const d = await api.post('/chat/send', { text: q });
      setMsgs((m) => [...m, { id: 'a' + Date.now(), role: 'assistant', text: d.reply }]);
    } catch (e) {
      setMsgs((m) => [...m, { id: 'e' + Date.now(), role: 'assistant', text: 'Sorry, something went wrong.' }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-20 lg:bottom-5 right-5 z-40 rounded-full shadow-lg transition-all ${open ? 'opacity-0 pointer-events-none' : 'opacity-100'} bg-gradient-to-br from-brand-500 to-brand-700 text-white px-4 py-3 flex items-center gap-2 hover:scale-105`}
      >
        <MessageCircle size={20} />
        <span className="font-medium text-sm hidden sm:inline">Ask Schedula</span>
      </button>

      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[min(380px,calc(100vw-2rem))] h-[min(560px,calc(100vh-2rem))] flex flex-col card overflow-hidden animate-slide-up">
          <div className="px-4 py-3 bg-gradient-to-r from-brand-600 to-brand-700 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} />
              <span className="font-semibold">Schedula Assistant</span>
            </div>
            <button onClick={() => setOpen(false)} className="hover:bg-white/10 p-1 rounded"><X size={16} /></button>
          </div>
          <div ref={scroller} className="flex-1 overflow-y-auto p-3 space-y-2 bg-ink-50">
            {!msgs.length && (
              <div className="bg-white p-3 rounded-2xl rounded-tl-md max-w-[85%] shadow-soft text-sm text-ink-700">
                Hi! I can help with services, bookings, plans and more.
              </div>
            )}
            {msgs.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 text-sm shadow-soft whitespace-pre-line ${
                  m.role === 'user'
                    ? 'bg-brand-600 text-white rounded-2xl rounded-br-md'
                    : 'bg-white text-ink-800 rounded-2xl rounded-tl-md'
                }`}>{m.text}</div>
              </div>
            ))}
            {busy && (
              <div className="flex">
                <div className="bg-white p-3 rounded-2xl rounded-tl-md shadow-soft text-sm text-ink-500 animate-pulse-soft">Thinking…</div>
              </div>
            )}
          </div>
          <div className="border-t border-ink-200 p-2 flex gap-2 bg-white">
            <input
              className="input"
              placeholder="Ask anything…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
            />
            <button className="btn-primary" onClick={send} disabled={busy || !text.trim()}><Send size={16} /></button>
          </div>
        </div>
      )}
    </>
  );
}
