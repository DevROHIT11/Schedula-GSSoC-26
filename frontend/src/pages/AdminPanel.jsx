import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from 'recharts';
import {
  Users, Briefcase, CalendarCheck, FileText, IndianRupee, Star, ShieldCheck,
  TrendingUp, Search, MessageSquare, RefreshCw,
} from 'lucide-react';
import { api } from '../api/client';

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9', '#ec4899', '#14b8a6'];

export default function AdminPanel() {
  const nav = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [pendingId, setPendingId] = useState(null);

  // Reviews / feedback feed
  const [reviews, setReviews] = useState([]);
  const [reviewsAgg, setReviewsAgg] = useState({ avg: 0, total: 0 });
  const [reviewsSort, setReviewsSort] = useState('latest');
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const loadReviews = async (sort = reviewsSort) => {
    setReviewsLoading(true);
    try {
      const d = await api.get(`/admin/reviews?sort=${encodeURIComponent(sort)}&limit=100`);
      setReviews(d.reviews || []);
      setReviewsAgg({ avg: Number(d.avg_rating) || 0, total: Number(d.total) || 0 });
    } catch (e) { setError(e.message); }
    finally { setReviewsLoading(false); }
  };

  const load = () => Promise.all([
    api.get('/admin/dashboard').then(setStats),
    api.get('/admin/users').then((d) => setUsers(d.users)),
    loadReviews('latest'),
  ]).catch((e) => setError(e.message));

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { loadReviews(reviewsSort); /* eslint-disable-next-line */ }, [reviewsSort]);

  const setActive = async (id, val) => {
    setPendingId(id);
    try { await api.put(`/admin/users/${id}/active`, { is_active: val }); await load(); }
    catch (e) { setError(e.message); }
    finally { setPendingId(null); }
  };
  const setRole = async (id, role) => {
    setPendingId(id);
    try { await api.put(`/admin/users/${id}/role`, { role }); await load(); }
    catch (e) { setError(e.message); }
    finally { setPendingId(null); }
  };

  const filtered = useMemo(
    () => users.filter((u) => !filter || (u.full_name + ' ' + u.email + ' ' + u.role).toLowerCase().includes(filter.toLowerCase())),
    [users, filter]);

  if (!stats) return <div className="p-12 text-center text-ink-500">Loading…</div>;

  const scrollTo = (id) => () => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const trendData = stats.trends.map((t) => ({
    date: t.date.slice(5),
    Created: t.created, Completed: t.completed, Rescheduled: t.rescheduled, Cancelled: t.cancelled,
  }));

  return (
    <div className="space-y-6">
      <div>
        <span className="eyebrow">Admin</span>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink-900 mt-2 tracking-tightest">Dashboard</h1>
        <p className="text-sm text-ink-500 mt-1.5">System-level monitoring, analytics, user management and feedback.</p>
      </div>

      {error && <div className="card border-rose-200 bg-rose-50 text-rose-700 p-3 text-sm">{error}</div>}

      {/* Stat cards — every tile is now interactive */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon={Users}        color="bg-brand-50 text-brand-700"   label="Total users"         value={stats.total_users}        sub={`${stats.total_customers} customers`} onClick={scrollTo('section-users')} />
        <Stat icon={Briefcase}    color="bg-amber-50 text-amber-700"   label="Active providers"    value={stats.total_providers}    sub="Onboarded organisers"             onClick={scrollTo('section-providers')} />
        <Stat icon={CalendarCheck} color="bg-emerald-50 text-emerald-700" label="Total bookings"  value={stats.total_appointments} sub={`${stats.active_appointments} active`} onClick={scrollTo('section-bookings')} />
        <Stat icon={IndianRupee}  color="bg-purple-50 text-purple-700" label="Revenue"             value={`₹${Number(stats.total_revenue).toLocaleString('en-IN')}`} sub="Lifetime" onClick={scrollTo('section-analytics')} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon={FileText}     color="bg-rose-50 text-rose-700"     label="Services"            value={stats.total_services} onClick={() => nav('/organiser')} />
        <Stat icon={Star}         color="bg-amber-50 text-amber-700"   label="Customer satisfaction" value={`${Number(stats.customer_satisfaction).toFixed(2)} ★`} sub={`${stats.rating_count} ratings`} onClick={scrollTo('section-feedback')} />
        <Stat icon={TrendingUp}   color="bg-emerald-50 text-emerald-700" label="Trend (14d)"        value={trendData.reduce((s, x) => s + x.Created, 0)} sub="Bookings created" onClick={scrollTo('section-bookings')} />
        <Stat icon={ShieldCheck}  color="bg-brand-50 text-brand-700"   label="Active customers"    value={stats.total_customers} onClick={scrollTo('section-users')} />
      </div>

      {/* Trend chart */}
      <div id="section-bookings" className="card p-5 scroll-mt-24">
        <div className="flex items-end justify-between mb-3">
          <div>
            <h3 className="font-bold text-ink-900">Booking trends · last 14 days</h3>
            <p className="text-xs text-ink-500">Created · Completed · Rescheduled · Cancelled</p>
          </div>
        </div>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
              <Legend wrapperStyle={{ paddingTop: 8 }} />
              <Area type="monotone" dataKey="Created" stroke="#6366f1" strokeWidth={2} fill="url(#g1)" />
              <Area type="monotone" dataKey="Completed" stroke="#10b981" strokeWidth={2} fill="url(#g2)" />
              <Line type="monotone" dataKey="Rescheduled" stroke="#f59e0b" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Cancelled" stroke="#ef4444" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row */}
      <div id="section-analytics" className="grid grid-cols-1 lg:grid-cols-3 gap-5 scroll-mt-24">
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-bold text-ink-900 mb-3">Peak booking hours (24h)</h3>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={stats.peak_hours.map((p) => ({ hour: `${String(p.hour).padStart(2, '0')}h`, bookings: p.count }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="hour" stroke="#94a3b8" fontSize={10} interval={1} />
                <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                <Tooltip cursor={{ fill: '#eef2ff' }} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                <Bar dataKey="bookings" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-5">
          <h3 className="font-bold text-ink-900 mb-3">By category</h3>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={stats.by_category.filter((b) => b.bookings > 0)} dataKey="bookings" nameKey="category" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {stats.by_category.map((b, i) => <Cell key={i} fill={b.color || PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Provider utilization */}
      <div id="section-providers" className="card p-5 scroll-mt-24">
        <h3 className="font-bold text-ink-900 mb-3">Top providers</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-ink-500 uppercase">
              <tr><th className="text-left py-2">Provider</th><th className="text-right py-2">Bookings</th><th className="text-right py-2">Revenue</th></tr>
            </thead>
            <tbody>
              {stats.provider_utilization.map((p) => (
                <tr key={p.id} className="border-t border-ink-200">
                  <td className="py-2 font-medium">{p.full_name}</td>
                  <td className="py-2 text-right">{p.bookings}</td>
                  <td className="py-2 text-right">₹{Number(p.revenue).toLocaleString('en-IN')}</td>
                </tr>
              ))}
              {stats.provider_utilization.length === 0 && <tr><td colSpan={3} className="text-center py-6 text-ink-500">No data yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Feedback feed — every review submitted across the platform */}
      <div id="section-feedback" className="card p-5 scroll-mt-24">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div>
            <h3 className="font-display font-semibold text-ink-900 tracking-crisp flex items-center gap-2">
              <MessageSquare size={16} /> Customer feedback
              {reviewsAgg.total > 0 && (
                <span className="text-xs text-ink-500 font-normal">
                  · {reviewsAgg.total} review{reviewsAgg.total !== 1 ? 's' : ''} · avg {reviewsAgg.avg.toFixed(2)} ★
                </span>
              )}
            </h3>
            <p className="text-xs text-ink-500 mt-1">Latest customer ratings and comments — linked to the booking that produced them.</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={reviewsSort} onChange={(e) => setReviewsSort(e.target.value)}
                    className="input !w-auto !py-1.5 !text-xs">
              <option value="latest">Latest</option>
              <option value="highest">Highest rated</option>
            </select>
            <button onClick={() => loadReviews()} className="btn-ghost !p-2" title="Refresh">
              <RefreshCw size={14} className={reviewsLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {reviewsLoading && reviews.length === 0 && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 shimmer-bg rounded-xl" />
            ))}
          </div>
        )}
        {!reviewsLoading && reviews.length === 0 && (
          <div className="text-center py-10 text-sm text-ink-500">No feedback submitted yet.</div>
        )}
        {reviews.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-ink-500 uppercase tracking-wider">
                <tr>
                  <th className="text-left py-2.5 font-medium">When</th>
                  <th className="text-left py-2.5 font-medium">Customer</th>
                  <th className="text-left py-2.5 font-medium">Service</th>
                  <th className="text-left py-2.5 font-medium">Rating</th>
                  <th className="text-left py-2.5 font-medium">Comment</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.id} className="border-t border-ink-200 align-top">
                    <td className="py-3 text-xs text-ink-500 whitespace-nowrap">{new Date(r.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</td>
                    <td className="py-3">
                      <div className="font-medium text-ink-900">{r.customer_name}</div>
                      <div className="text-xs text-ink-500">{r.customer_email}</div>
                    </td>
                    <td className="py-3">
                      <a href={`/services/${r.service_id}`} className="text-brand-700 hover:underline">{r.service_name}</a>
                      {r.booking_id && <div className="text-[11px] text-ink-400 mt-0.5">booking #{r.booking_id}</div>}
                    </td>
                    <td className="py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-0.5">
                        {[1,2,3,4,5].map((i) => (
                          <Star key={i} size={13} className={i <= r.rating ? 'text-amber-500 fill-amber-500' : 'text-ink-200 fill-ink-100'} />
                        ))}
                        <span className="ml-1 text-xs text-ink-500">{r.rating}/5</span>
                      </span>
                    </td>
                    <td className="py-3 text-ink-700 max-w-md">{r.comment || <span className="text-ink-400 italic">No comment</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Users table */}
      <div id="section-users" className="card p-5 scroll-mt-24">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <h3 className="font-bold text-ink-900">User management</h3>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input className="input !pl-9 !w-72" placeholder="Search users…" value={filter} onChange={(e) => setFilter(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-ink-500 uppercase">
              <tr><th className="text-left py-2">Name</th><th className="text-left py-2">Email</th><th className="text-left py-2">City</th><th className="text-left py-2">Role</th><th className="text-left py-2">Status</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-t border-ink-200">
                  <td className="py-2 font-medium">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full overflow-hidden bg-ink-900 text-white text-[10px] font-semibold flex items-center justify-center flex-shrink-0">
                        {u.avatar_url
                          ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                          : (u.full_name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                      <span>{u.full_name}</span>
                    </div>
                  </td>
                  <td className="py-2 text-ink-500">{u.email}</td>
                  <td className="py-2 text-ink-500">{u.city || '—'}</td>
                  <td className="py-2">
                    <select className="input !py-1.5" value={u.role} onChange={(e) => setRole(u.id, e.target.value)} disabled={pendingId === u.id}>
                      <option value="customer">customer</option>
                      <option value="organiser">organiser</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="py-2">
                    {u.is_active ? <span className="pill-green">Active</span> : <span className="pill-rose">Inactive</span>}
                  </td>
                  <td className="py-2 text-right">
                    <button className="btn-outline !py-1.5 !px-3 text-xs" disabled={pendingId === u.id} onClick={() => setActive(u.id, !u.is_active)}>
                      {pendingId === u.id ? 'Updating…' : (u.is_active ? 'Deactivate' : 'Activate')}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-6 text-ink-500">No matching users.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, color, label, value, sub, onClick }) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`stat-card text-left w-full ${onClick ? 'hover:shadow-lg hover:-translate-y-0.5 transition cursor-pointer focus:outline-none focus:ring-4 focus:ring-brand-100' : ''}`}
    >
      <div>
        <div className="text-xs uppercase tracking-wide font-medium text-ink-500">{label}</div>
        <div className="text-2xl font-bold text-ink-900 mt-1">{value}</div>
        {sub && <div className="text-xs text-ink-400 mt-0.5">{sub}</div>}
      </div>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={20} />
      </div>
    </Wrapper>
  );
}
