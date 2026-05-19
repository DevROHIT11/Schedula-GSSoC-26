import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Loader2, Mail, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client';
import AuthShell from '../components/AuthShell.jsx';

export default function VerifyOtp() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [email, setEmail] = useState(params.get('email') || '');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setInfo(''); setBusy(true);
    try {
      await api.post('/auth/verify-otp', { email, otp: otp.trim() });
      setDone(true);
      setTimeout(() => nav('/login'), 1500);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const resend = async () => {
    setError(''); setInfo(''); setResending(true);
    try {
      const d = await api.post('/auth/resend-otp', { email });
      setInfo(d.message || 'A new verification code has been sent.');
    } catch (e) { setError(e.message); }
    finally { setResending(false); }
  };

  return (
    <AuthShell title="Verify your email" subtitle={<>We sent a 6-digit code to <b>{email || 'your email'}</b>.</>}>
      {error && <div className="card border-rose-200 bg-rose-50 text-rose-700 p-3 mb-4 text-sm">{error}</div>}
      {info && <div className="card border-brand-200 bg-brand-50 text-brand-700 p-3 mb-4 text-sm">{info}</div>}
      {done ? (
        <div className="card border-emerald-200 bg-emerald-50 text-emerald-700 p-4 text-sm flex items-center gap-2">
          <CheckCircle2 size={18} /> Verified! Redirecting…
        </div>
      ) : (
        <form className="space-y-4" onSubmit={submit}>
          <div>
            <label className="label flex items-center gap-1"><Mail size={14} /> Email</label>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label">OTP code</label>
            <input className="input text-center tracking-[0.5em] font-bold text-lg" value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              required placeholder="······" maxLength={6} />
          </div>
          <button className="btn-primary w-full !py-3" disabled={busy} type="submit">
            {busy ? <Loader2 size={16} className="animate-spin" /> : null}
            {busy ? 'Verifying…' : 'Verify'}
          </button>
          <button type="button" className="btn-ghost w-full" disabled={resending || !email} onClick={resend}>
            {resending ? 'Sending new code…' : 'Resend code'}
          </button>
          <div className="text-center text-sm text-ink-500">
            <Link to="/login" className="text-brand-600 hover:underline">Back to sign in</Link>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
