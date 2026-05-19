import { forwardRef } from 'react';
import { filterPhone, onlyDigits, onlyFloat, filterEmail } from '../utils/validators';

// A single visual primitive used by every input/select/textarea on the site.
// Tighter padding and inline error/hint slot — designed to be denser than a
// standalone <label>+<input> pair.
function FieldShell({ label, error, hint, required, htmlFor, className = '', children }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="block text-[11px] font-semibold uppercase tracking-wide text-ink-600 mb-1">
          {label}{required && <span className="text-rose-500"> *</span>}
        </label>
      )}
      {children}
      {error
        ? <div className="text-[11px] text-rose-600 mt-1 flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-rose-500" /> {error}</div>
        : hint
          ? <div className="text-[11px] text-ink-500 mt-1">{hint}</div>
          : null}
    </div>
  );
}

const baseInput = 'w-full px-3 py-2 rounded-lg border bg-white text-ink-900 placeholder-ink-400 outline-none focus:ring-4 focus:ring-brand-100 transition';
const okBorder  = 'border-ink-200 focus:border-brand-400';
const errBorder = 'border-rose-300 focus:border-rose-400 focus:ring-rose-100';

export const TextField = forwardRef(function TextField(
  { label, error, hint, required, className, inputClassName, ...props }, ref
) {
  return (
    <FieldShell label={label} error={error} hint={hint} required={required} htmlFor={props.id} className={className}>
      <input ref={ref} {...props}
        className={`${baseInput} ${error ? errBorder : okBorder} ${inputClassName || ''}`} />
    </FieldShell>
  );
});

export const TextArea = forwardRef(function TextArea(
  { label, error, hint, required, className, ...props }, ref
) {
  return (
    <FieldShell label={label} error={error} hint={hint} required={required} htmlFor={props.id} className={className}>
      <textarea ref={ref} {...props}
        className={`${baseInput} ${error ? errBorder : okBorder} min-h-[72px]`} />
    </FieldShell>
  );
});

export const SelectField = forwardRef(function SelectField(
  { label, error, hint, required, className, children, ...props }, ref
) {
  return (
    <FieldShell label={label} error={error} hint={hint} required={required} htmlFor={props.id} className={className}>
      <select ref={ref} {...props}
        className={`${baseInput} ${error ? errBorder : okBorder} pr-8`}>
        {children}
      </select>
    </FieldShell>
  );
});

// Specialized inputs that filter as the user types.
export function PhoneField({ value, onChange, ...rest }) {
  return (
    <TextField
      type="tel"
      inputMode="numeric"
      autoComplete="tel"
      placeholder="9876543210"
      value={value || ''}
      onChange={(e) => onChange(filterPhone(e.target.value))}
      {...rest}
    />
  );
}

export function EmailField({ value, onChange, ...rest }) {
  return (
    <TextField
      type="email"
      inputMode="email"
      autoComplete="email"
      placeholder="you@example.com"
      value={value || ''}
      onChange={(e) => onChange(filterEmail(e.target.value))}
      {...rest}
    />
  );
}

export function IntField({ value, onChange, min, max, ...rest }) {
  return (
    <TextField
      type="text"
      inputMode="numeric"
      value={value === '' || value == null ? '' : String(value)}
      onChange={(e) => {
        let v = onlyDigits(e.target.value);
        if (v === '') return onChange('');
        let n = Number(v);
        if (Number.isFinite(min) && n < min) n = min;
        if (Number.isFinite(max) && n > max) n = max;
        onChange(String(n));
      }}
      {...rest}
    />
  );
}

export function MoneyField({ value, onChange, ...rest }) {
  return (
    <TextField
      type="text"
      inputMode="decimal"
      placeholder="0"
      value={value === '' || value == null ? '' : String(value)}
      onChange={(e) => onChange(onlyFloat(e.target.value))}
      {...rest}
    />
  );
}
