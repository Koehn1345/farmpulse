import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  SignIn,
  useAuth,
  OrganizationList,
  useOrganization,
} from '@clerk/clerk-react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Truck, Wheat, Users, TrendingUp, TrendingDown,
  MapPin, Menu, X, Settings, Users2, LogOut
} from 'lucide-react';
import { setTokenGetter } from './lib/api.js';
import { FarmProvider, useFarm } from './context/FarmContext.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Loads from './pages/Loads.jsx';
import EmployeeLoads from './pages/EmployeeLoads.jsx';
import Commodities from './pages/Commodities.jsx';
import Customers from './pages/Customers.jsx';
import Income from './pages/Income.jsx';
import Expenses from './pages/Expenses.jsx';
import Fields from './pages/Fields.jsx';
import Team from './pages/Team.jsx';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Token injector - wires Clerk token into every API call
function TokenInjector() {
  const { getToken } = useAuth();
  useEffect(() => {
    setTokenGetter(() => getToken());
  }, [getToken]);
  return null;
}

// Org gate - require user to pick/create an org (= their farm)
function OrgGate({ children }) {
  const { organization, isLoaded } = useOrganization();
  if (!isLoaded) return <LoadingScreen />;
  if (!organization) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-display text-soil-400 mb-2">FarmPulse</h1>
          <p className="text-slate-400 text-sm">Select your farm or create a new one to continue</p>
        </div>
        <OrganizationList
          hidePersonal
          afterSelectOrganizationUrl="/"
          afterCreateOrganizationUrl="/"
        />
      </div>
    );
  }
  return children;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-soil-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <div className="text-slate-400 text-sm font-display text-xl text-soil-400">FarmPulse</div>
      </div>
    </div>
  );
}

// Admin sidebar nav
const adminNav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/loads', label: 'Loads', icon: Truck },
  { to: '/commodities', label: 'Commodities', icon: Wheat },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/income', label: 'Income', icon: TrendingUp },
  { to: '/expenses', label: 'Expenses', icon: TrendingDown },
  { to: '/fields', label: 'Fields', icon: MapPin },
  { to: '/team', label: 'Team', icon: Users2 },
];

const employeeNav = [
  { to: '/', label: 'Log Load', icon: Truck, exact: true },
];

function Sidebar({ open, onClose }) {
  const { isAdmin, farm, role } = useFarm();
  const nav = isAdmin ? adminNav : employeeNav;
  const { organization } = useOrganization();

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={onClose} />}
      <aside className={`
        fixed top-0 left-0 h-full w-60 bg-slate-950 border-r border-slate-800 z-30 flex flex-col
        transform transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto
      `}>
        <div className="px-6 py-5 border-b border-slate-800">
          <span className="font-display text-2xl text-soil-400 tracking-tight">FarmPulse</span>
          <div className="text-xs text-slate-500 mt-0.5 truncate">{organization?.name || 'My Farm'}</div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {nav.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-soil-500/20 text-soil-300 border border-soil-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                }`
              }
            >
              <Icon size={16} strokeWidth={1.8} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-slate-800 space-y-1">
          <div className="px-3 py-1.5 rounded-lg bg-slate-800/50 text-xs text-slate-400 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isAdmin ? 'bg-soil-400' : 'bg-blue-400'}`} />
            {role === 'admin' ? 'Admin' : role === 'trucker' ? 'Trucker' : 'Employee'}
          </div>
        </div>
      </aside>
    </>
  );
}

function AppShell() {
  const { isAdmin, loading } = useFarm();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) return <LoadingScreen />;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-slate-800 bg-slate-950">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-400 hover:text-slate-200">
            <Menu size={20} />
          </button>
          <span className="font-display text-xl text-soil-400">FarmPulse</span>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Routes>
            {isAdmin ? (
              <>
                <Route path="/" element={<Dashboard />} />
                <Route path="/loads" element={<Loads />} />
                <Route path="/commodities" element={<Commodities />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/income" element={<Income />} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/fields" element={<Fields />} />
                <Route path="/team" element={<Team />} />
              </>
            ) : (
              <>
                <Route path="/" element={<EmployeeLoads />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            )}
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <BrowserRouter>
        <SignedOut>
          <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
            <div className="mb-10 text-center">
              <h1 className="text-5xl font-display text-soil-400 mb-3">FarmPulse</h1>
              <p className="text-slate-400">Agricultural operations management</p>
            </div>
            <SignIn routing="hash" afterSignInUrl="/" />
          </div>
        </SignedOut>
        <SignedIn>
          <TokenInjector />
          <OrgGate>
            <FarmProvider>
              <AppShell />
            </FarmProvider>
          </OrgGate>
        </SignedIn>
      </BrowserRouter>
    </ClerkProvider>
  );
}
