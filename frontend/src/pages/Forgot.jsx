import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { api } from '../api/client';
import AuthShell from '../components/AuthShell.jsx';

export default function Forgot() {
  const [email, setEmail] = useState('');
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setInfo(''); setBusy(true);
    try {
      const d = await api.post('/auth/forgot', { email });
      setInfo(d.message || 'If that email exists, a password reset link has been sent.');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  return (
    <AuthShell title="Forgot password?" subtitle="Enter your email and we'll send a reset link." footer={<>Remembered it? <Link to="/login" className="text-brand-600 hover:underline">Sign in</Link></>}>
      {error && <div className="card border-rose-200 bg-rose-50 text-rose-700 p-3 mb-4 text-sm">{error}</div>}
      {info && <div className="card border-emerald-200 bg-emerald-50 text-emerald-700 p-3 mb-4 text-sm">{info}</div>}
      <form className="space-y-4" onSubmit={submit}>
        <div>
          <label className="label">Email</label>
          <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        <button className="btn-primary w-full !py-3" disabled={busy} type="submit">
          {busy ? <Loader2 size={16} className="animate-spin" /> : null}
          {busy ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
    </AuthShell>
  );
}
