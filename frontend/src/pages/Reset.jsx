import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { api } from '../api/client';
import PasswordInput from '../components/PasswordInput.jsx';
import AuthShell from '../components/AuthShell.jsx';

export default function Reset() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [form, setForm] = useState({
    email: params.get('email') || '',
    token: params.get('token') || '',
    new_password: '',
  });
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      await api.post('/auth/reset', form);
      setInfo('Password updated. Redirecting…');
      setTimeout(() => nav('/login'), 1200);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  return (
    <AuthShell title="Set a new password" subtitle="Choose something memorable but secure." footer={<><Link to="/login" className="text-brand-600 hover:underline">Back to sign in</Link></>}>
      {error && <div className="card border-rose-200 bg-rose-50 text-rose-700 p-3 mb-4 text-sm">{error}</div>}
      {info && <div className="card border-emerald-200 bg-emerald-50 text-emerald-700 p-3 mb-4 text-sm">{info}</div>}
      <form className="space-y-4" onSubmit={submit}>
        <div><label className="label">Email</label>
          <input type="email" className="input" value={form.email} onChange={set('email')} required /></div>
        <div><label className="label">Reset token</label>
          <input className="input" value={form.token} onChange={set('token')} required placeholder="From email" /></div>
        <div><label className="label">New password</label>
          <PasswordInput value={form.new_password} onChange={set('new_password')} required autoComplete="new-password" placeholder="At least 6 characters" /></div>
        <button className="btn-primary w-full !py-3" disabled={busy} type="submit">
          {busy ? <Loader2 size={16} className="animate-spin" /> : null}
          {busy ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </AuthShell>
  );
}
