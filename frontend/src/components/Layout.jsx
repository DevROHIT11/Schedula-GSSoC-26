import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Compass, User, Briefcase, Shield,
  Bell, LogOut, Menu, X, Sparkles, Coins, Bookmark, Video,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client';
import ChatbotWidget from './ChatbotWidget.jsx';
import SearchAutocomplete from './SearchAutocomplete.jsx';
import MobileBottomNav from './MobileBottomNav.jsx';
import UpcomingMeetingBanner from './UpcomingMeetingBanner.jsx';

function NavItem({ to, icon: Icon, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `group/navitem relative flex items-center gap-3 py-2.5 px-3 rounded-2xl text-sm font-medium transition
         ${isActive
            ? 'bg-ink-900 text-white'
            : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900'}`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={18} strokeWidth={isActive ? 2.2 : 1.9} className="flex-shrink-0" />
          <span className="whitespace-nowrap">{label}</span>
          {isActive && (
            <span className="absolute right-3 w-1.5 h-1.5 rounded-full bg-accent-400" aria-hidden />
          )}
        </>
      )}
    </NavLink>
  );
}

function PlanCreditsBadge() {
  const { user } = useAuth();
  const [credits, setCredits] = useState(null);
  const [plan, setPlan] = useState(null);
  useEffect(() => {
    if (!user) { setCredits(null); setPlan(null); return; }
    api.get('/credits/me').then((d) => setCredits(d.balance)).catch(() => {});
    api.get('/subscriptions/mine').then((d) => setPlan(d.subscription || null)).catch(() => {});
  }, [user]);
  if (!user) return null;
  return (
    <div className="hidden md:flex items-center gap-2">
      {plan && (
        <Link to="/plans" className="pill bg-amber-50 text-amber-800 hover:bg-amber-100 transition" title="Your plan">
          <Sparkles size={10} /> {plan.name}
        </Link>
      )}
      {credits !== null && (
        <Link to="/credits" className="pill-brand hover:bg-brand-100 transition" title="Available credits">
          <Coins size={10} /> {credits.toLocaleString()}
        </Link>
      )}
    </div>
  );
}

function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const { user } = useAuth();

  const load = async () => {
    if (!user) return;
    try {
      const d = await api.get('/notifications');
      setItems(d.notifications || []);
      setUnread(d.unread_count || 0);
    } catch { /* empty */ }
  };

  useEffect(() => { load(); }, [user]);
  useEffect(() => {
    if (!user) return;
    const h = setInterval(load, 30000);
    return () => clearInterval(h);
  }, [user]);

  const markAll = async () => {
    try { await api.put('/notifications/read-all'); load(); } catch { /* empty */ }
  };
  const clearAll = async () => {
    try { await api.del('/notifications'); load(); } catch { /* empty */ }
  };
  const dismiss = async (id) => {
    setItems((arr) => arr.filter((x) => x.id !== id));
    try { await api.del(`/notifications/${id}`); } catch { /* empty */ }
    setUnread((u) => Math.max(0, u - 1));
  };

  if (!user) return null;
  return (
    <div className="relative">
      <button className="btn-ghost !p-2.5 !rounded-full relative" onClick={() => setOpen((v) => !v)} aria-label="Notifications">
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-accent-500 text-white text-[10px] font-bold flex items-center justify-center px-1 ring-2 ring-white">{unread}</span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-[min(380px,calc(100vw-1rem))] max-h-[480px] overflow-auto card z-50 animate-fade-in">
            <div className="sticky top-0 bg-white/95 backdrop-blur flex items-center justify-between px-4 py-3 border-b border-ink-200 z-10">
              <div className="flex items-baseline gap-2">
                <span className="font-display font-semibold">Notifications</span>
                {unread > 0 && <span className="text-xs text-ink-500">{unread} new</span>}
              </div>
              <div className="flex gap-3">
                <button className="text-xs text-brand-600 hover:underline" onClick={markAll}>Mark all read</button>
                <button className="text-xs text-ink-500 hover:text-rose-600" onClick={clearAll}>Clear all</button>
              </div>
            </div>
            {!items.length && <div className="p-10 text-center text-sm text-ink-500">You're all caught up.</div>}
            <ul>
              {items.map((n) => (
                <li key={n.id}
                    className={`group relative px-4 py-3 border-b border-ink-200 last:border-0 transition-colors ${n.is_read ? '' : 'bg-brand-50/40'}`}>
                  <button
                    onClick={() => dismiss(n.id)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition p-1 rounded-full hover:bg-ink-100 text-ink-400 hover:text-rose-600"
                    title="Dismiss"
                  >
                    <X size={14} />
                  </button>
                  <div className="pr-6">
                    <div className="text-sm font-medium text-ink-900">{n.title}</div>
                    {n.body && <div className="text-xs text-ink-500 mt-0.5 leading-relaxed">{n.body}</div>}
                    <div className="text-[10px] uppercase tracking-[0.12em] text-ink-400 mt-1">{new Date(n.created_at).toLocaleString()}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const initials = user
    ? (user.full_name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
    : '';
  const fullName = user?.full_name || '';

  useEffect(() => { setOpen(false); }, [loc.pathname]);

  const isAuthRoute = ['/login','/register','/verify-otp','/forgot','/reset'].some((p) => loc.pathname.startsWith(p));
  if (isAuthRoute) {
    return <div className="min-h-screen bg-ink-50">{children}</div>;
  }

  const sidebarItems = [
    { to: '/', icon: Compass, label: 'Discover', end: true },
    ...(user ? [{ to: '/saved', icon: Bookmark, label: 'Saved' }] : []),
    ...(user ? [{ to: '/profile', icon: User, label: 'My bookings' }] : []),
    ...(user ? [{ to: '/plans', icon: Sparkles, label: 'Plans' }] : []),
    ...(user ? [{ to: '/credits', icon: Coins, label: 'Credits' }] : []),
    ...(user && (user.role === 'organiser' || user.role === 'admin')
      ? [{ to: '/organiser', icon: Briefcase, label: 'Organiser' }] : []),
    ...(user && (user.role === 'organiser' || user.role === 'admin')
      ? [{ to: '/organiser/meetings', icon: Video, label: 'Meetings' }] : []),
    ...(user && user.role === 'admin' ? [{ to: '/admin', icon: Shield, label: 'Admin' }] : []),
  ];

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Desktop sidebar — generous, editorial, always-visible labels.
          Fixed width keeps the rhythm steady; no hover-expand surprises. */}
      <aside
        className="hidden lg:flex lg:flex-col
                   fixed left-0 top-0 h-screen z-40
                   w-[260px]
                   bg-white border-r border-ink-200 px-5 py-6 overflow-hidden"
      >
        <Link to="/" className="flex items-center gap-3 mb-10 h-10 px-1">
          <div className="w-10 h-10 rounded-2xl bg-ink-900 flex items-center justify-center text-white font-display font-bold shadow-soft flex-shrink-0">S</div>
          <div className="overflow-hidden">
            <div className="font-display font-bold text-ink-900 leading-none whitespace-nowrap tracking-crisp">Schedula</div>
            <div className="text-[11px] text-ink-500 whitespace-nowrap mt-1">Book trusted services</div>
          </div>
        </Link>

        <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-ink-400 mb-2 pl-3">Menu</div>
        <nav className="space-y-1 flex-1">
          {sidebarItems.map((it) => <NavItem key={it.to} {...it} />)}
        </nav>

        {user ? (
          <div className="mt-4 rounded-2xl border border-ink-200 bg-ink-50/60 p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-ink-900 text-white font-semibold text-sm flex items-center justify-center flex-shrink-0">
              {user.avatar_url
                ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                : initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{fullName.split(' ')[0]}</div>
              <div className="text-[11px] text-ink-500 capitalize">{user.role}</div>
            </div>
            <button
              onClick={() => { logout(); nav('/login'); }}
              title="Sign out"
              className="p-2 hover:bg-white rounded-xl text-ink-500 hover:text-ink-900 transition"
            >
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-ink-200 bg-ink-50/60 p-4">
            <div className="text-xs text-ink-500 mb-2">Sign in to book and save services.</div>
            <Link to="/login" className="btn-primary w-full !py-2 text-xs">Sign in</Link>
          </div>
        )}
      </aside>

      {/* Reserved gutter so main content sits to the right of the sidebar */}
      <div className="flex lg:pl-[260px]">

      {/* Mobile drawer */}
      {open && (
        <>
          <div className="lg:hidden fixed inset-0 bg-ink-900/40 backdrop-blur-sm z-40" onClick={() => setOpen(false)} />
          <aside className="lg:hidden fixed left-0 top-0 bottom-0 w-72 bg-white z-50 px-5 py-5 animate-slide-up overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <Link to="/" className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-ink-900 flex items-center justify-center text-white font-display font-bold">S</div>
                <span className="font-display font-bold tracking-crisp">Schedula</span>
              </Link>
              <button onClick={() => setOpen(false)} className="p-2 rounded-full hover:bg-ink-100"><X size={20} /></button>
            </div>
            <nav className="space-y-1">
              {sidebarItems.map((it) => <NavItem key={it.to} {...it} />)}
            </nav>
          </aside>
        </>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar — translucent, paper-grade border */}
        <header className="sticky top-0 z-30 bg-ink-50/85 backdrop-blur-md border-b border-ink-200/70">
          <div className="px-4 sm:px-8 py-3.5 flex items-center gap-5">
            <button onClick={() => setOpen(true)} className="lg:hidden p-2 -ml-2 rounded-full hover:bg-ink-100"><Menu size={20} /></button>
            <SearchAutocomplete />
            <div className="flex items-center gap-3 ml-auto">
              <PlanCreditsBadge />
              <NotificationsBell />
              {!user && (
                <>
                  <Link to="/login" className="btn-ghost">Sign in</Link>
                  <Link to="/register" className="btn-primary hidden sm:inline-flex">Get started</Link>
                </>
              )}
              {user && (
                <Link to="/profile" className="hidden md:flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border border-ink-200 hover:border-ink-400 hover:bg-white transition">
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-ink-900 text-white text-[11px] font-semibold flex items-center justify-center">
                    {user.avatar_url
                      ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                      : initials}
                  </div>
                  <span className="text-sm font-medium">{fullName.split(' ')[0]}</span>
                </Link>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-8 py-8 pb-24 lg:pb-10 max-w-[1400px] w-full mx-auto">
          {user && <UpcomingMeetingBanner />}
          {children}
        </main>
      </div>

      </div>{/* end of pl-[260px] gutter wrapper */}

      {user && <ChatbotWidget />}
      <MobileBottomNav />
    </div>
  );
}
