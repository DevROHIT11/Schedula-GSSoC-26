import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ChevronLeft, MapPin, Video, Layers } from 'lucide-react';
import { api } from '../api/client';
import ImageUploader from '../components/ImageUploader.jsx';
import { isHttpUrl } from '../utils/format';
import { useToast } from '../components/Toast.jsx';
import { onlyDigits, onlyFloat, filterAlpha } from '../utils/validators';

export default function OrganiserNew() {
  const nav = useNavigate();
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [countries, setCountries] = useState(['India']);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [cities, setCities] = useState([]);
  const [f, setF] = useState({
    name: '', description: '', image_url: '', category_id: '',
    duration_minutes: 30, buffer_minutes: 0,
    appointment_type: 'in_person', virtual_provider: 'none', virtual_link: '',
    country: 'India', state: '', district: '', city: '',
    price: 0, tax_threshold: 0,
    manage_capacity: false, max_per_slot: 1, group_booking: false,
    advance_payment: false, manual_confirmation: false,
    assignment_mode: 'auto', schedule_type: 'weekly', resource_kind: 'user',
    is_published: true,
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/categories').then((d) => setCategories(d.categories || [])).catch(() => {});
    api.get('/master/countries').then((d) => setCountries(d.countries || ['India'])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!f.country) { setStates([]); return; }
    api.get(`/master/states?country=${encodeURIComponent(f.country)}`)
      .then((d) => setStates(d.states || [])).catch(() => setStates([]));
  }, [f.country]);

  useEffect(() => {
    if (!f.state) { setDistricts([]); return; }
    api.get(`/master/districts?country=${encodeURIComponent(f.country)}&state=${encodeURIComponent(f.state)}`)
      .then((d) => setDistricts(d.districts || [])).catch(() => setDistricts([]));
  }, [f.country, f.state]);

  useEffect(() => {
    if (!f.district) { setCities([]); return; }
    api.get(`/master/cities?country=${encodeURIComponent(f.country)}&state=${encodeURIComponent(f.state)}&district=${encodeURIComponent(f.district)}`)
      .then((d) => setCities(d.cities || [])).catch(() => setCities([]));
  }, [f.country, f.state, f.district]);

  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setF((cur) => ({ ...cur, [k]: v }));
  };

  const apptType = f.appointment_type;
  const isVirtual = apptType === 'virtual';
  const isHybrid  = apptType === 'hybrid';
  const needsLocation = apptType === 'in_person' || isHybrid;
  const needsVirtual  = isVirtual || isHybrid;
  const needsCustomLink = needsVirtual && f.virtual_provider === 'custom';

  useEffect(() => {
    if (apptType === 'in_person') setF((cur) => ({ ...cur, virtual_provider: 'none', virtual_link: '' }));
  }, [apptType]);

  const validate = () => {
    if (!f.name.trim()) return 'Service name is required.';
    if (Number(f.duration_minutes) < 5) return 'Duration must be at least 5 minutes.';
    if (Number(f.price) < 0) return 'Price cannot be negative.';
    if (needsLocation && (!f.state || !f.city)) return 'State and city are required for in-person / hybrid services.';
    if (needsVirtual && f.virtual_provider === 'none')
      return 'Pick a virtual provider (Google Meet / Zoom / Jitsi default).';
    if (needsCustomLink && !isHttpUrl(f.virtual_link))
      return 'A valid http(s) meeting URL is required for the custom virtual provider.';
    if (f.image_url && !isHttpUrl(f.image_url) && !f.image_url.startsWith('/uploads/'))
      return 'Image URL must start with http(s):// or be uploaded.';
    return null;
  };

  const submit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { toast.push({ kind: 'error', text: err }); return; }
    setBusy(true);
    try {
      // Compose a venue string from location fields for backend back-compat.
      const venueParts = [f.city, f.district, f.state].filter(Boolean);
      const computedVenue = needsLocation ? venueParts.join(', ') : '';
      const payload = {
        ...f,
        category_id: f.category_id ? Number(f.category_id) : null,
        venue: computedVenue,
        virtual_provider: needsVirtual ? f.virtual_provider : 'none',
        virtual_link: needsVirtual ? f.virtual_link || null : null,
      };
      const d = await api.post('/services', payload);
      toast.push({ kind: 'success', title: 'Service created', text: 'Configure schedule + resources next.' });
      nav(`/organiser/services/${d.id}`);
    } catch (e) { toast.push({ kind: 'error', text: e.message }); }
    finally { setBusy(false); }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={() => nav(-1)} className="btn-ghost mb-4"><ChevronLeft size={16} /> Back</button>
      <div className="card p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-ink-900 flex items-center gap-2"><Layers size={20} className="text-brand-600" /> Create appointment type</h1>
        <p className="text-sm text-ink-500 mt-1">Fill the basics — schedules, questions and resources can be refined next.</p>

        <form className="space-y-6 mt-6" onSubmit={submit} noValidate>
          {/* SECTION: Basics — name, description, image */}
          <Section title="Basics">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><label className="label">Service name *</label>
                <input className="input" value={f.name}
                       onChange={(e) => setF((c) => ({ ...c, name: e.target.value.slice(0, 160) }))} required />
                <div className="text-[10px] text-ink-400 text-right mt-0.5">{f.name.length}/160</div></div>
              <div className="sm:col-span-2"><label className="label">Description</label>
                <textarea className="input min-h-[68px]" value={f.description}
                          onChange={(e) => setF((c) => ({ ...c, description: e.target.value }))}
                          placeholder="What does this service include?" /></div>
              <div className="sm:col-span-2">
                <ImageUploader value={f.image_url} onChange={(v) => setF((c) => ({ ...c, image_url: v }))} />
              </div>
            </div>
          </Section>

          {/* SECTION: Type + category — 2-column */}
          <Section title="Type & category">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Appointment type</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { k: 'in_person', label: 'In-person', icon: MapPin },
                    { k: 'virtual',   label: 'Virtual',   icon: Video },
                    { k: 'hybrid',    label: 'Hybrid',    icon: Layers },
                  ].map((opt) => (
                    <button type="button" key={opt.k}
                      onClick={() => setF((c) => ({ ...c, appointment_type: opt.k }))}
                      className={`card !p-2.5 text-center transition ${apptType === opt.k ? 'ring-2 ring-brand-400 bg-brand-50' : 'hover:shadow-md'}`}>
                      <opt.icon size={14} className="text-brand-600 mx-auto" />
                      <div className="font-semibold text-xs mt-1">{opt.label}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Category</label>
                <select className="input" value={f.category_id} onChange={set('category_id')}>
                  <option value="">Choose a category…</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name} {c.tax_percentage ? `· ${c.tax_percentage}% GST` : ''}</option>)}
                </select>
              </div>
            </div>
          </Section>

          {/* SECTION: Location — only for in_person/hybrid (full master data) */}
          {needsLocation && (
            <Section title="Location" subtitle="Pick any state, district & city across India.">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="label">Country</label>
                  <select className="input" value={f.country}
                    onChange={(e) => setF((c) => ({ ...c, country: e.target.value, state: '', district: '', city: '' }))}>
                    {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select></div>
                <div><label className="label">State *</label>
                  <select className="input" value={f.state}
                    onChange={(e) => setF((c) => ({ ...c, state: e.target.value, district: '', city: '' }))}>
                    <option value="">— Select state —</option>
                    {states.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select></div>
                <div><label className="label">District</label>
                  <select className="input" value={f.district}
                    onChange={(e) => setF((c) => ({ ...c, district: e.target.value, city: '' }))}
                    disabled={!f.state}>
                    <option value="">— Select district —</option>
                    {districts.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select></div>
                <div><label className="label">City *</label>
                  <select className="input" value={f.city} onChange={set('city')} disabled={!f.district}>
                    <option value="">— Select city —</option>
                    {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select></div>
              </div>
            </Section>
          )}

          {/* SECTION: Virtual setup */}
          {needsVirtual && (
            <Section title="Virtual meeting" subtitle="Default uses Jitsi (free, instant). Override with your own room URL if you have one.">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="label">Virtual provider *</label>
                  <select className="input" value={f.virtual_provider} onChange={set('virtual_provider')}>
                    <option value="none">— Choose —</option>
                    <option value="google_meet">Jitsi auto-room (Google Meet labelled)</option>
                    <option value="zoom">Jitsi auto-room (Zoom labelled)</option>
                    <option value="custom">Custom URL (your own Meet/Zoom)</option>
                  </select></div>
                {needsCustomLink && (
                  <div><label className="label">Meeting URL *</label>
                    <input className="input" value={f.virtual_link} onChange={set('virtual_link')}
                           placeholder="https://meet.google.com/abc-defg-hij" required /></div>
                )}
              </div>
            </Section>
          )}

          {/* SECTION: Pricing — 2-column */}
          <Section title="Pricing & duration">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="label">Price (₹)</label>
                <input type="text" inputMode="decimal" className="input" value={f.price}
                       onChange={(e) => setF((c) => ({ ...c, price: onlyFloat(e.target.value) }))} />
                <div className="text-[11px] text-ink-500 mt-1">GST auto-applied per category — no manual tax.</div>
              </div>
              <div><label className="label">Tax-free threshold (₹)</label>
                <input type="text" inputMode="decimal" className="input" value={f.tax_threshold}
                       onChange={(e) => setF((c) => ({ ...c, tax_threshold: onlyFloat(e.target.value) }))} />
                <div className="text-[11px] text-ink-500 mt-1">Tax kicks in only above this amount.</div>
              </div>
              <div><label className="label">Duration (min) *</label>
                <input type="text" inputMode="numeric" className="input" value={f.duration_minutes}
                       onChange={(e) => setF((c) => ({ ...c, duration_minutes: onlyDigits(e.target.value) || '' }))} required /></div>
              <div><label className="label">Buffer between slots (min)</label>
                <input type="text" inputMode="numeric" className="input" value={f.buffer_minutes}
                       onChange={(e) => setF((c) => ({ ...c, buffer_minutes: onlyDigits(e.target.value) || '0' }))} /></div>
            </div>
          </Section>

          {/* SECTION: Operations */}
          <Section title="Operations">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><label className="label">Schedule type</label>
                <select className="input" value={f.schedule_type} onChange={set('schedule_type')}>
                  <option value="weekly">Weekly</option>
                  <option value="flexible">Flexible</option>
                </select></div>
              <div><label className="label">Assignment</label>
                <select className="input" value={f.assignment_mode} onChange={set('assignment_mode')}>
                  <option value="auto">Auto-assign</option>
                  <option value="manual">Customer picks</option>
                </select></div>
              <div><label className="label">Resource kind</label>
                <select className="input" value={f.resource_kind} onChange={set('resource_kind')}>
                  <option value="user">User / provider</option>
                  <option value="resource">Resource (room, equipment)</option>
                </select></div>
              <div><label className="label">Status</label>
                <select className="input" value={f.is_published ? '1' : '0'}
                        onChange={(e) => setF((c) => ({ ...c, is_published: e.target.value === '1' }))}>
                  <option value="1">Published</option>
                  <option value="0">Draft (unpublished)</option>
                </select></div>
              {f.manage_capacity && (
                <div><label className="label">Max bookings per slot</label>
                  <input type="number" min={1} className="input" value={f.max_per_slot} onChange={set('max_per_slot')} /></div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <Toggle label="Manage capacity (group / multi-booking)" checked={f.manage_capacity} onChange={set('manage_capacity')} />
              <Toggle label="Group booking allowed" checked={f.group_booking} onChange={set('group_booking')} />
              <Toggle label="Advance payment required" checked={f.advance_payment} onChange={set('advance_payment')} />
              <Toggle label="Manual confirmation" checked={f.manual_confirmation} onChange={set('manual_confirmation')} />
            </div>
          </Section>

          <button type="submit" className="btn-primary w-full !py-3" disabled={busy}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : null}
            {busy ? 'Creating…' : 'Create service'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-2.5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">{title}</h2>
        {subtitle && <span className="text-xs text-ink-400">{subtitle}</span>}
      </div>
      {children}
    </section>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="card p-3 flex items-center gap-3 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={onChange} className="accent-brand-600 w-4 h-4" />
      <span className="text-sm text-ink-800">{label}</span>
    </label>
  );
}
