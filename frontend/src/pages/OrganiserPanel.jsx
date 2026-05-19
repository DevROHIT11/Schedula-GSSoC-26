import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ExternalLink, Settings, BarChart3, CheckCircle2, FileText, Sparkles, Power, Trash2 } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { api } from '../api/client';
import { imageFor, descriptionFor } from '../utils/serviceVisuals';

export default function OrganiserPanel() {
  const [services, setServices] = useState([]);
  const [reports, setReports] = useState(null);
  const [error, setError] = useState('');

  const reload = () => api.get('/services/mine/list').then((d) => setServices(d.services)).catch((e) => setError(e.message));

  useEffect(() => {
    reload();
    api.get('/admin/reports').then(setReports).catch(() => {});
  }, []);

  const togglePublish = async (svc) => {
    try {
      await api.put(`/services/${svc.id}/publish`, { publish: !svc.is_published });
      reload();
    } catch (e) { setError(e.message); }
  };

  const deleteService = async (svc) => {
    if (!confirm(`Delete "${svc.name}"? It'll be hidden from customers and stop accepting bookings.`)) return;
    try { await api.del(`/services/${svc.id}`); reload(); }
    catch (e) { setError(e.message); }
  };

  const published = services.filter((s) => s.is_published).length;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Organiser dashboard</h1>
          <p className="text-sm text-ink-500">Manage services, schedules, and bookings</p>
        </div>
        <Link to="/organiser/new" className="btn-primary"><Plus size={14} /> New service</Link>
      </div>

      {error && <div className="card border-rose-200 bg-rose-50 text-rose-700 p-3 text-sm">{error}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Stat icon={FileText} color="bg-brand-50 text-brand-700" label="Services" value={services.length} />
        <Stat icon={CheckCircle2} color="bg-emerald-50 text-emerald-700" label="Published" value={published} />
        <Stat icon={BarChart3} color="bg-amber-50 text-amber-700" label="Bookings" value={reports?.total_appointments ?? '—'} />
        <Stat icon={Sparkles} color="bg-purple-50 text-purple-700" label="Drafts" value={services.length - published} />
      </div>

      {!services.length && (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-3">🚀</div>
          <h3 className="text-lg font-bold text-ink-900">Create your first service</h3>
          <p className="text-sm text-ink-500 mt-1 mb-4">Set up an appointment type and start accepting bookings in minutes.</p>
          <Link to="/organiser/new" className="btn-primary inline-flex"><Plus size={14} /> New service</Link>
        </div>
      )}

      {services.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((s) => (
            <article key={s.id} className="card overflow-hidden flex flex-col">
              <div className="relative aspect-[16/9] bg-cover bg-center" style={{ backgroundImage: `url(${imageFor(s)})` }}>
                <div className="absolute top-3 left-3 flex gap-2">
                  {s.is_published ? <span className="pill-green">Published</span> : <span className="pill-slate">Draft</span>}
                  <span className="pill bg-white/90 text-ink-800 backdrop-blur">{s.duration_minutes} min</span>
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col gap-2">
                <h3 className="font-bold text-ink-900">{s.name}</h3>
                <p className="text-sm text-ink-500 line-clamp-2">{descriptionFor(s)}</p>
                <div className="text-xs text-ink-400 break-all">/services/share/{s.share_token}</div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Link to={`/organiser/services/${s.id}`} className="btn-outline !py-1.5 !px-3 text-xs flex-1"><Settings size={12} /> Manage</Link>
                  <Link to={`/services/${s.id}`} target="_blank" className="btn-ghost !py-1.5 !px-3 text-xs"><ExternalLink size={12} /> Preview</Link>
                  <button onClick={() => togglePublish(s)}
                          className={`btn-ghost !py-1.5 !px-3 text-xs ${s.is_published ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}>
                    <Power size={12} /> {s.is_published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button onClick={() => deleteService(s)}
                          className="btn-ghost !py-1.5 !px-3 text-xs text-rose-600 hover:bg-rose-50">
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {reports && services.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="card p-5">
            <h3 className="font-bold text-ink-900 mb-3">Peak booking hours</h3>
            {reports.peak_hours.length === 0 ? (
              <div className="text-sm text-ink-500">No data yet.</div>
            ) : (
              <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer>
                  <BarChart data={reports.peak_hours.slice(0, 8).map((p) => ({ hour: `${String(p.hour).padStart(2, '0')}:00`, bookings: Number(p.bookings) }))}>
                    <XAxis dataKey="hour" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                    <Tooltip cursor={{ fill: '#eef2ff' }} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                    <Bar dataKey="bookings" fill="#6366f1" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <div className="card p-5">
            <h3 className="font-bold text-ink-900 mb-3">Resource utilisation</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-ink-500 uppercase">
                  <tr><th className="text-left py-2">Service</th><th className="text-left py-2">Resource</th><th className="text-right py-2">Bookings</th></tr>
                </thead>
                <tbody>
                  {reports.provider_utilization.map((p) => (
                    <tr key={p.resource_id} className="border-t border-ink-200">
                      <td className="py-2">{p.service_name}</td>
                      <td className="py-2">{p.resource_name}</td>
                      <td className="py-2 text-right font-semibold">{p.bookings}</td>
                    </tr>
                  ))}
                  {reports.provider_utilization.length === 0 && (
                    <tr><td colSpan={3} className="text-ink-500 py-4 text-center">No bookings yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, color, label, value }) {
  return (
    <div className="stat-card">
      <div>
        <div className="text-xs uppercase tracking-wide font-medium text-ink-500">{label}</div>
        <div className="text-2xl font-bold text-ink-900 mt-1">{value}</div>
      </div>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={20} />
      </div>
    </div>
  );
}
