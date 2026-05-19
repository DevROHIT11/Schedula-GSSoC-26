import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { CATEGORY_SLUGS } from './data/categories';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import VerifyOtp from './pages/VerifyOtp.jsx';
import Forgot from './pages/Forgot.jsx';
import Reset from './pages/Reset.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ServiceDetail from './pages/ServiceDetail.jsx';
import BookingFlow from './pages/BookingFlow.jsx';
import BookingConfirmed from './pages/BookingConfirmed.jsx';
import Profile from './pages/Profile.jsx';
import Reschedule from './pages/Reschedule.jsx';
import Payment from './pages/Payment.jsx';
import Plans from './pages/Plans.jsx';
import Credits from './pages/Credits.jsx';
import Saved from './pages/Saved.jsx';
import ServicesPage from './pages/ServicesPage.jsx';
import SearchPage from './pages/SearchPage.jsx';

// Heavy pages with charts / large editors → lazy-loaded.
const OrganiserPanel    = lazy(() => import('./pages/OrganiserPanel.jsx'));
const OrganiserService  = lazy(() => import('./pages/OrganiserService.jsx'));
const OrganiserNew      = lazy(() => import('./pages/OrganiserNew.jsx'));
const OrganiserMeetings = lazy(() => import('./pages/OrganiserMeetings.jsx'));
const AdminPanel        = lazy(() => import('./pages/AdminPanel.jsx'));

const Fallback = () => <div className="p-12 text-center text-ink-500">Loading…</div>;

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="p-12 text-center text-ink-500">Loading…</div>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

// Dispatcher for /services/:id — sends category slugs to ServicesPage,
// numeric service IDs to ServiceDetail. Preserves existing behavior 100%.
function ServicesDispatcher() {
  const { id } = useParams();
  return CATEGORY_SLUGS.has(id) ? <ServicesPage /> : <ServiceDetail />;
}

export default function App() {
  return (
    <Layout>
      <Suspense fallback={<Fallback />}>
      <Routes>
        <Route path="/login"      element={<Login />} />
        <Route path="/register"   element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/forgot"     element={<Forgot />} />
        <Route path="/reset"      element={<Reset />} />

        <Route path="/" element={<Dashboard />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/services/:id" element={<ServicesDispatcher />} />
        <Route path="/services/share/:token" element={<ServiceDetail share />} />

        <Route path="/book/:serviceId" element={<PrivateRoute><BookingFlow /></PrivateRoute>} />
        <Route path="/booking/:id" element={<PrivateRoute><BookingConfirmed /></PrivateRoute>} />
        <Route path="/booking/:id/pay" element={<PrivateRoute><Payment /></PrivateRoute>} />
        <Route path="/booking/:id/reschedule" element={<PrivateRoute><Reschedule /></PrivateRoute>} />

        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/plans"   element={<PrivateRoute><Plans /></PrivateRoute>} />
        <Route path="/credits" element={<PrivateRoute><Credits /></PrivateRoute>} />
        <Route path="/saved"   element={<PrivateRoute><Saved /></PrivateRoute>} />

        <Route path="/organiser" element={<PrivateRoute roles={['organiser', 'admin']}><OrganiserPanel /></PrivateRoute>} />
        <Route path="/organiser/meetings" element={<PrivateRoute roles={['organiser', 'admin']}><OrganiserMeetings /></PrivateRoute>} />
        <Route path="/organiser/new" element={<PrivateRoute roles={['organiser', 'admin']}><OrganiserNew /></PrivateRoute>} />
        <Route path="/organiser/services/:id" element={<PrivateRoute roles={['organiser', 'admin']}><OrganiserService /></PrivateRoute>} />

        <Route path="/admin" element={<PrivateRoute roles={['admin']}><AdminPanel /></PrivateRoute>} />

        <Route path="*" element={<div className="card p-12 text-center text-ink-500">Page not found</div>} />
      </Routes>
      </Suspense>
    </Layout>
  );
}
