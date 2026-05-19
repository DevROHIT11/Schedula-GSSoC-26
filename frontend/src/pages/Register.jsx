import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { api } from '../api/client';
import PasswordInput from '../components/PasswordInput.jsx';
import AuthShell from '../components/AuthShell.jsx';
import { TextField, EmailField, PhoneField, SelectField } from '../components/Field.jsx';
import { isValidPhone, isValidEmail, isValidName, filterAlpha } from '../utils/validators';
import { useToast } from '../components/Toast.jsx';

export default function Register() {
  const nav = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', password: '', role: 'customer',
  });
  const [touched, setTouched] = useState({});
  const [busy, setBusy] = useState(false);

  const errors = useMemo(() => ({
    full_name: !isValidName(form.full_name) ? 'Letters only — at least 2 characters.' : null,
    email:     !isValidEmail(form.email) ? 'Enter a valid email address.' : null,
    phone:     !isValidPhone(form.phone) ? 'Phone must be 10–15 digits.' : null,
    password:  form.password.length < 6 ? 'Password must be at least 6 characters.' : null,
  }), [form]);

  const isValid = !Object.values(errors).some(Boolean);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const blur = (k) => () => setTouched((t) => ({ ...t, [k]: true }));

  const submit = async (e) => {
    e.preventDefault();
    setTouched({ full_name: 1, email: 1, phone: 1, password: 1 });
    if (!isValid) { toast.push({ kind: 'error', text: 'Please fix the errors highlighted below.' }); return; }
    setBusy(true);
    try {
      await api.post('/auth/register', form);
      toast.push({ kind: 'success', title: 'Account created', text: 'Check your email for the verification code.' });
      nav(`/verify-otp?email=${encodeURIComponent(form.email)}`);
    } catch (e) { toast.push({ kind: 'error', text: e.message }); }
    finally { setBusy(false); }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Book in seconds. No calls required."
      footer={<>Already a member? <Link to="/login" className="text-brand-600 font-medium hover:underline">Sign in</Link></>}
    >
      <form className="space-y-3" onSubmit={submit} noValidate>
        <TextField
          label="Full name" required
          value={form.full_name}
          onChange={(e) => set('full_name', filterAlpha(e.target.value))}
          onBlur={blur('full_name')}
          error={touched.full_name ? errors.full_name : null}
          autoComplete="name"
        />
        <EmailField
          label="Email" required
          value={form.email}
          onChange={(v) => set('email', v)}
          onBlur={blur('email')}
          error={touched.email ? errors.email : null}
        />
        <PhoneField
          label="Mobile number" required
          value={form.phone}
          onChange={(v) => set('phone', v)}
          onBlur={blur('phone')}
          error={touched.phone ? errors.phone : null}
          hint="Digits only — country code optional."
        />
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-ink-600 mb-1">Password <span className="text-rose-500">*</span></label>
          <PasswordInput value={form.password} onChange={(e) => set('password', e.target.value)} required autoComplete="new-password" placeholder="At least 6 characters" />
          {touched.password && errors.password && <div className="text-[11px] text-rose-600 mt-1">{errors.password}</div>}
        </div>
        <SelectField
          label="I am a…"
          value={form.role}
          onChange={(e) => set('role', e.target.value)}
        >
          <option value="customer">Customer (book appointments)</option>
          <option value="organiser">Organiser (offer services)</option>
        </SelectField>
        <button className="btn-primary w-full !py-3 mt-2" disabled={busy} type="submit">
          {busy ? <Loader2 size={16} className="animate-spin" /> : null}
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  );
}
