import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Trash2, Plus, Save, Eye, Power, Loader2, MapPin, Video } from 'lucide-react';
import { api } from '../api/client';
import ImageUploader from '../components/ImageUploader.jsx';
import { isHttpUrl, formatDateTime } from '../utils/format';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const todayStr = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const STATUS_PILL = { confirmed: 'pill-green', reserved: 'pill-amber', pending: 'pill-amber', cancelled: 'pill-rose', completed: 'pill-slate' };

const TABS = [
  { key: 'config', label: 'Configuration' },
  { key: 'resources', label: 'Resources' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'questions', label: 'Questions' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'bookings', label: 'Bookings' },
];

export default function OrganiserService() {
  const { id } = useParams();
  const nav = useNavigate();
  const [tab, setTab] = useState('config');
  const [data, setData] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [calendar, setCalendar] = useState([]);
  const [calRange, setCalRange] = useState({ from: todayStr(), to: todayStr() });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const [s, setS] = useState(null);
  const [resources, setResources] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [weekly, setWeekly] = useState([]);
  const [flex, setFlex] = useState([]);
  const [categories, setCategories] = useState([]);

  const load = async () => {
    const d = await api.get(`/services/${id}`);
    setData(d); setS(d.service); setResources(d.resources);
    setQuestions(d.questions); setWeekly(d.weekly); setFlex(d.flex);
  };
  const loadBookings = () => api.get(`/services/${id}/bookings`).then((d) => setBookings(d.bookings));
  const loadCalendar = () => api.get(`/services/${id}/calendar?from=${calRange.from}&to=${calRange.to}`).then((d) => setCalendar(d.bookings));

  useEffect(() => { load().catch((e) => setError(e.message)); loadBookings(); api.get('/categories').then((d) => setCategories(d.categories || [])).catch(() => {}); }, [id]);
  useEffect(() => { loadCalendar(); }, [calRange]);

  const setSField = (k) => (e) => setS({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const saveService = async () => {
    setError(''); setInfo('');
    // Frontend validation mirrors backend.
    const apptType = s.appointment_type;
    const needsVenue = apptType === 'in_person' || apptType === 'hybrid';
    const needsVirtual = apptType === 'virtual' || apptType === 'hybrid';
    if (needsVenue && !String(s.venue || '').trim()) {
      setError('Venue is required for in-person/hybrid appointments.'); return;
    }
    if (needsVirtual && (!s.virtual_provider || s.virtual_provider === 'none')) {
      setError('Pick a virtual provider for virtual/hybrid appointments.'); return;
    }
    if (needsVirtual && s.virtual_provider === 'custom' && !isHttpUrl(s.virtual_link)) {
      setError('A valid http(s) URL is required for the custom virtual provider.'); return;
    }
    setBusy(true);
    try {
      await api.put(`/services/${id}`, {
        ...s,
        venue: needsVenue ? s.venue : '',
        virtual_provider: needsVirtual ? s.virtual_provider : 'none',
        virtual_link: needsVirtual ? s.virtual_link : null,
      });
      setInfo('Settings saved.');
    }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const togglePublish = async () => {
    await api.put(`/services/${id}/publish`, { publish: !s.is_published });
    setS({ ...s, is_published: !s.is_published });
  };

  const addResource = async () => {
    const name = prompt('Resource / provider name:'); if (!name) return;
    await api.post(`/services/${id}/resources`, { name }); load();
  };
  const delResource = async (rid) => {
    if (!confirm('Delete this resource?')) return;
    await api.del(`/services/${id}/resources/${rid}`); load();
  };

  const addWeekly = () => setWeekly([...weekly, { day_of_week: 1, start_time: '09:00', end_time: '17:00' }]);
  const saveWeekly = async () => {
    await api.put(`/services/${id}/weekly`, {
      items: weekly.map((w) => ({
        day_of_week: Number(w.day_of_week),
        start_time: String(w.start_time).length === 5 ? w.start_time + ':00' : w.start_time,
        end_time: String(w.end_time).length === 5 ? w.end_time + ':00' : w.end_time,
      })),
    });
    setInfo('Weekly schedule saved.');
  };

  const addFlex = () => setFlex([...flex, { start_datetime: todayStr() + ' 09:00:00', end_datetime: todayStr() + ' 17:00:00' }]);
  const saveFlex = async () => {
    await api.put(`/services/${id}/flexible`, { items: flex });
    setInfo('Flexible slots saved.');
  };

  const addQ = () => setQuestions([...questions, { question: '', field_type: 'text', is_required: 1 }]);
  const saveQ = async () => {
    await api.put(`/services/${id}/questions`, { items: questions });
    setInfo('Questions saved.');
  };

  const confirmBooking = async (bid) => { await api.post(`/bookings/${bid}/confirm`); loadBookings(); };
  const cancelBooking = async (bid) => { if (confirm('Cancel?')) { await api.post(`/bookings/${bid}/cancel`); loadBookings(); } };

  if (!data || !s) return <div className="p-12 text-center text-ink-500">Loading…</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <button onClick={() => nav(-1)} className="btn-ghost"><ChevronLeft size={16} /> Back</button>
      {error && <div className="card border-rose-200 bg-rose-50 text-rose-700 p-3 text-sm">{error}</div>}
      {info && <div className="card border-emerald-200 bg-emerald-50 text-emerald-700 p-3 text-sm">{info}</div>}

      <div className="card p-5 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-xl font-bold text-ink-900">{s.name}</h1>
          <div className="text-xs text-ink-500 break-all">/services/share/{s.share_token}</div>
        </div>
        {s.is_published ? <span className="pill-green">Published</span> : <span className="pill-slate">Draft</span>}
        <button className="btn-outline" onClick={togglePublish}><Power size={14} /> {s.is_published ? 'Unpublish' : 'Publish'}</button>
        <Link to={`/services/${id}`} target="_blank" className="btn-ghost"><Eye size={14} /> Preview</Link>
      </div>

      <div className="card overflow-x-auto">
        <div className="flex border-b border-ink-200">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition ${tab === t.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-500 hover:text-ink-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === 'config' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><label className="label">Name</label>
                <input className="input" value={s.name} onChange={setSField('name')} /></div>
              <div className="sm:col-span-2"><label className="label">Description</label>
                <textarea className="input min-h-[88px]" value={s.description || ''} onChange={setSField('description')} /></div>
              <div className="sm:col-span-2">
                <ImageUploader value={s.image_url || ''} onChange={(v) => setS({ ...s, image_url: v })} />
              </div>
              <div><label className="label">Category</label>
                <select className="input" value={s.category_id || ''} onChange={setSField('category_id')}>
                  <option value="">None</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select></div>
              <div><label className="label">Resource kind</label>
                <select className="input" value={s.resource_kind} onChange={setSField('resource_kind')}>
                  <option value="user">User</option>
                  <option value="resource">Resource</option>
                </select></div>
              <div><label className="label">Duration (min)</label>
                <input type="number" min={5} className="input" value={s.duration_minutes} onChange={setSField('duration_minutes')} /></div>
              <div><label className="label">Buffer (min)</label>
                <input type="number" min={0} className="input" value={s.buffer_minutes || 0} onChange={setSField('buffer_minutes')} /></div>

              {/* Appointment type — drives venue / virtual fields below. */}
              <div className="sm:col-span-2 card p-4 bg-ink-50 border-dashed">
                <div className="text-xs font-semibold uppercase tracking-wide text-ink-500 mb-2">Appointment type</div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { k: 'in_person', label: 'In-person', icon: MapPin },
                    { k: 'virtual',   label: 'Virtual',   icon: Video },
                    { k: 'hybrid',    label: 'Hybrid',    icon: MapPin },
                  ].map((opt) => (
                    <button type="button" key={opt.k}
                      onClick={() => setS({
                        ...s,
                        appointment_type: opt.k,
                        venue: opt.k === 'virtual' ? '' : s.venue,
                        virtual_provider: opt.k === 'in_person' ? 'none' : s.virtual_provider,
                        virtual_link: opt.k === 'in_person' ? null : s.virtual_link,
                      })}
                      className={`card p-3 text-left transition ${s.appointment_type === opt.k ? 'ring-2 ring-brand-400' : 'hover:shadow-md'}`}>
                      <opt.icon size={16} className="text-brand-600" />
                      <div className="font-semibold text-sm mt-1">{opt.label}</div>
                    </button>
                  ))}
                </div>

                {(s.appointment_type === 'in_person' || s.appointment_type === 'hybrid') && (
                  <div className="mt-3"><label className="label">Venue *</label>
                    <input className="input" value={s.venue || ''} onChange={setSField('venue')} required /></div>
                )}
                {(s.appointment_type === 'virtual' || s.appointment_type === 'hybrid') && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <div><label className="label">Virtual provider *</label>
                      <select className="input" value={s.virtual_provider} onChange={setSField('virtual_provider')}>
                        <option value="none">— Choose —</option>
                        <option value="google_meet">Google Meet (auto link)</option>
                        <option value="zoom">Zoom (auto link)</option>
                        <option value="custom">Custom URL</option>
                      </select></div>
                    {s.virtual_provider === 'custom' && (
                      <div><label className="label">Meeting URL *</label>
                        <input className="input" value={s.virtual_link || ''} onChange={setSField('virtual_link')}
                          placeholder="https://your-meeting-url" /></div>
                    )}
                  </div>
                )}
              </div>

              <div><label className="label">Price (₹)</label>
                <input type="number" step="0.01" className="input" value={s.price} onChange={setSField('price')} /></div>
              <div><label className="label">Tax %</label>
                <input type="number" step="0.01" className="input" value={s.tax_percent} onChange={setSField('tax_percent')} /></div>
              <div><label className="label">Tax threshold (₹)</label>
                <input type="number" step="0.01" className="input" value={s.tax_threshold || 0} onChange={setSField('tax_threshold')} /></div>
              <div><label className="label">Schedule type</label>
                <select className="input" value={s.schedule_type} onChange={setSField('schedule_type')}>
                  <option value="weekly">Weekly</option>
                  <option value="flexible">Flexible</option>
                </select></div>
              <div><label className="label">Assignment</label>
                <select className="input" value={s.assignment_mode} onChange={setSField('assignment_mode')}>
                  <option value="auto">Auto</option>
                  <option value="manual">Manual</option>
                </select></div>

              <div className="sm:col-span-2 flex flex-wrap gap-3">
                <Toggle label="Manage capacity" checked={!!Number(s.manage_capacity)} onChange={setSField('manage_capacity')} />
                {!!Number(s.manage_capacity) && (
                  <div><label className="label">Max per slot</label>
                    <input type="number" min={1} className="input" value={s.max_per_slot} onChange={setSField('max_per_slot')} /></div>
                )}
                <Toggle label="Group booking" checked={!!Number(s.group_booking)} onChange={setSField('group_booking')} />
                <Toggle label="Advance payment required" checked={!!Number(s.advance_payment)} onChange={setSField('advance_payment')} />
                <Toggle label="Manual confirmation" checked={!!Number(s.manual_confirmation)} onChange={setSField('manual_confirmation')} />
              </div>
              <div className="sm:col-span-2">
                <button className="btn-primary" onClick={saveService} disabled={busy}>
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save settings
                </button>
              </div>
            </div>
          )}

          {tab === 'resources' && (
            <div className="space-y-3">
              {resources.map((r) => (
                <div key={r.id} className="card p-3 flex items-center justify-between">
                  <div className="font-medium">{r.name}</div>
                  <button className="btn-ghost text-rose-600" onClick={() => delResource(r.id)}><Trash2 size={14} /></button>
                </div>
              ))}
              <button className="btn-outline" onClick={addResource}><Plus size={14} /> Add resource / provider</button>
            </div>
          )}

          {tab === 'schedule' && (s.schedule_type === 'weekly' ? (
            <div className="space-y-3">
              <h3 className="font-semibold text-ink-900">Weekly schedule</h3>
              {weekly.map((w, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4 sm:col-span-3"><label className="label">Day</label>
                    <select className="input" value={w.day_of_week} onChange={(e) => setWeekly(weekly.map((x, idx) => idx === i ? { ...x, day_of_week: e.target.value } : x))}>
                      {DAYS.map((d, idx) => <option key={idx} value={idx}>{d}</option>)}
                    </select>
                  </div>
                  <div className="col-span-3"><label className="label">Start</label>
                    <input type="time" className="input" value={String(w.start_time).slice(0, 5)} onChange={(e) => setWeekly(weekly.map((x, idx) => idx === i ? { ...x, start_time: e.target.value } : x))} /></div>
                  <div className="col-span-3"><label className="label">End</label>
                    <input type="time" className="input" value={String(w.end_time).slice(0, 5)} onChange={(e) => setWeekly(weekly.map((x, idx) => idx === i ? { ...x, end_time: e.target.value } : x))} /></div>
                  <div className="col-span-2 sm:col-span-3 flex justify-end">
                    <button className="btn-ghost text-rose-600" onClick={() => setWeekly(weekly.filter((_, idx) => idx !== i))}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
              <div className="flex gap-2">
                <button className="btn-outline" onClick={addWeekly}><Plus size={14} /> Add window</button>
                <button className="btn-primary" onClick={saveWeekly}><Save size={14} /> Save</button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="font-semibold text-ink-900">Flexible slots</h3>
              {flex.map((w, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5"><label className="label">Start</label>
                    <input type="datetime-local" className="input" value={String(w.start_datetime).replace(' ', 'T').slice(0, 16)}
                           onChange={(e) => setFlex(flex.map((x, idx) => idx === i ? { ...x, start_datetime: e.target.value.replace('T', ' ') + ':00' } : x))} /></div>
                  <div className="col-span-5"><label className="label">End</label>
                    <input type="datetime-local" className="input" value={String(w.end_datetime).replace(' ', 'T').slice(0, 16)}
                           onChange={(e) => setFlex(flex.map((x, idx) => idx === i ? { ...x, end_datetime: e.target.value.replace('T', ' ') + ':00' } : x))} /></div>
                  <div className="col-span-2 flex justify-end">
                    <button className="btn-ghost text-rose-600" onClick={() => setFlex(flex.filter((_, idx) => idx !== i))}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
              <div className="flex gap-2">
                <button className="btn-outline" onClick={addFlex}><Plus size={14} /> Add window</button>
                <button className="btn-primary" onClick={saveFlex}><Save size={14} /> Save</button>
              </div>
            </div>
          ))}

          {tab === 'questions' && (
            <div className="space-y-3">
              {questions.map((q, i) => (
                <div key={i} className="card p-3 grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-12 sm:col-span-5"><label className="label">Question</label>
                    <input className="input" value={q.question} onChange={(e) => setQuestions(questions.map((x, idx) => idx === i ? { ...x, question: e.target.value } : x))} /></div>
                  <div className="col-span-6 sm:col-span-2"><label className="label">Type</label>
                    <select className="input" value={q.field_type} onChange={(e) => setQuestions(questions.map((x, idx) => idx === i ? { ...x, field_type: e.target.value } : x))}>
                      <option value="text">text</option><option value="textarea">textarea</option><option value="number">number</option>
                      <option value="email">email</option><option value="phone">phone</option><option value="select">select</option>
                    </select></div>
                  <div className="col-span-6 sm:col-span-3"><label className="label">Options (comma-separated)</label>
                    <input className="input" value={q.options || ''} onChange={(e) => setQuestions(questions.map((x, idx) => idx === i ? { ...x, options: e.target.value } : x))} /></div>
                  <div className="col-span-9 sm:col-span-1 flex items-center"><label className="text-xs flex items-center gap-1"><input type="checkbox" className="accent-brand-600" checked={!!Number(q.is_required)} onChange={(e) => setQuestions(questions.map((x, idx) => idx === i ? { ...x, is_required: e.target.checked ? 1 : 0 } : x))} /> required</label></div>
                  <div className="col-span-3 sm:col-span-1 flex justify-end"><button className="btn-ghost text-rose-600" onClick={() => setQuestions(questions.filter((_, idx) => idx !== i))}><Trash2 size={14} /></button></div>
                </div>
              ))}
              <div className="flex gap-2">
                <button className="btn-outline" onClick={addQ}><Plus size={14} /> Add question</button>
                <button className="btn-primary" onClick={saveQ}><Save size={14} /> Save</button>
              </div>
            </div>
          )}

          {tab === 'calendar' && (
            <div>
              <div className="flex flex-wrap gap-3 items-end mb-4">
                <div><label className="label">From</label><input type="date" className="input" value={calRange.from} onChange={(e) => setCalRange({ ...calRange, from: e.target.value })} /></div>
                <div><label className="label">To</label><input type="date" className="input" value={calRange.to} onChange={(e) => setCalRange({ ...calRange, to: e.target.value })} /></div>
              </div>
              {calendar.length === 0 && <div className="text-sm text-ink-500">No bookings in range.</div>}
              <div className="space-y-2">
                {calendar.map((b) => (
                  <div key={b.id} className="card p-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-sm">{formatDateTime(b.start_datetime)}</div>
                      <div className="text-xs text-ink-500">{b.customer_name} · {b.resource_name}</div>
                    </div>
                    <span className={STATUS_PILL[b.status] || 'pill-slate'}>{b.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'bookings' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-ink-500 uppercase">
                  <tr><th className="text-left py-2">When</th><th className="text-left py-2">Customer</th><th className="text-left py-2">Resource</th><th className="text-left py-2">Cap</th><th className="text-left py-2">Status</th><th className="text-left py-2">Pay</th><th></th></tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} className="border-t border-ink-200">
                      <td className="py-2">{formatDateTime(b.start_datetime)}</td>
                      <td className="py-2">{b.customer_name}<div className="text-xs text-ink-500">{b.customer_email}</div></td>
                      <td className="py-2">{b.resource_name}</td>
                      <td className="py-2">{b.capacity_taken}</td>
                      <td className="py-2"><span className={STATUS_PILL[b.status] || 'pill-slate'}>{b.status}</span></td>
                      <td className="py-2">{b.payment_status}</td>
                      <td className="py-2 flex gap-1 justify-end">
                        {b.status === 'reserved' && <button className="btn-soft !py-1 !px-2 text-xs" onClick={() => confirmBooking(b.id)}>Confirm</button>}
                        {b.status !== 'cancelled' && <button className="btn-ghost text-rose-600 !py-1 !px-2 text-xs" onClick={() => cancelBooking(b.id)}>Cancel</button>}
                      </td>
                    </tr>
                  ))}
                  {bookings.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-ink-500">No bookings yet.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
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
