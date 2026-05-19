import { NavLink } from 'react-router-dom';
import { Compass, Bookmark, CalendarCheck, User, Briefcase, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

// Bottom tab bar — visible only on screens narrower than `lg` so it
// complements the existing sidebar instead of duplicating it.
export default function MobileBottomNav() {
  const { user } = useAuth();
  if (!user) return null;

  const items = [
    { to: '/',         icon: Compass,        label: 'Discover',  end: true },
    { to: '/saved',    icon: Bookmark,       label: 'Saved' },
    { to: '/profile',  icon: CalendarCheck,  label: 'Bookings' },
    user.role === 'admin'
      ? { to: '/admin', icon: Shield, label: 'Admin' }
      : (user.role === 'organiser'
          ? { to: '/organiser', icon: Briefcase, label: 'Organise' }
          : { to: '/profile', icon: User, label: 'Profile' }),
  ];

  return (
    <nav
      aria-label="Primary"
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-ink-200 shadow-[0_-2px_12px_rgba(15,23,42,0.05)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="grid grid-cols-4">
        {items.map((it, i) => (
          <li key={`${it.to}-${i}`}>
            <NavLink
              to={it.to}
              end={it.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 py-2 px-1 text-[10px] font-medium transition ${
                  isActive ? 'text-ink-900' : 'text-ink-500 hover:text-ink-800'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`relative h-6 w-6 grid place-items-center transition ${isActive ? 'scale-110' : ''}`}>
                    <it.icon size={20} strokeWidth={isActive ? 2.4 : 2} />
                    {isActive && (
                      <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-6 h-1 rounded-full bg-accent-500" />
                    )}
                  </div>
                  <span>{it.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
