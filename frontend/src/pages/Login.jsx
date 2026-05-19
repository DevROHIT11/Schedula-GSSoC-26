import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import AuthShell from '../components/AuthShell.jsx';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try { await login(email, password); nav(next, { replace: true }); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage your appointments."
      footer={<>New here? <Link to="/register" className="text-brand-600 font-medium hover:underline">Create an account</Link></>}
    >
      {error && <div className="card border-rose-200 bg-rose-50 text-rose-700 p-3 mb-4 text-sm">{error}</div>}
      <form className="space-y-4" onSubmit={submit}>
        <div>
          <label className="label">Email</label>
          <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="label">Password</label>
            <Link to="/forgot" className="text-xs text-brand-600 hover:underline">Forgot password?</Link>
          </div>
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </div>
        <button className="btn-primary w-full !py-3" disabled={busy} type="submit">
          {busy ? <Loader2 size={16} className="animate-spin" /> : null}
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <div className="text-center text-xs text-ink-500 pt-2">
          Demo: <span className="font-mono">customer@app.com</span> / <span className="font-mono">password123</span>
        </div>
      </form>
    </AuthShell>
  );
}
