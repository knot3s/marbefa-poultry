import { Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGaugeHigh,
  faClipboardList,
  faTableList,
  faDrumstickBite,
  faTriangleExclamation,
  faChartLine,
  faFileLines,
  faUsers,
  faRightFromBracket,
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout, isManager } = useAuth();
  const location = useLocation();

  const links = [
    { to: '/', label: 'Dashboard', icon: faGaugeHigh },
    { to: '/daily-log', label: 'New Log', icon: faClipboardList },
    { to: '/daily-logs', label: 'Logs', icon: faTableList },
    { to: '/reports', label: 'Reports', icon: faFileLines },
    { to: '/batches', label: 'Batches', icon: faDrumstickBite, managerOnly: true },
    { to: '/alerts', label: 'Alerts', icon: faTriangleExclamation },
    { to: '/forecast', label: 'Forecast', icon: faChartLine, managerOnly: true },
    { to: '/users', label: 'Users', icon: faUsers, managerOnly: true },
  ];

  const visibleLinks = links.filter((l) => !l.managerOnly || isManager);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 fixed inset-y-0 left-0 bg-white border-r border-slate-200 z-40">
        <div className="h-16 flex items-center gap-2 px-5 border-b border-slate-200">
          <span className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-white">
            <FontAwesomeIcon icon={faDrumstickBite} />
          </span>
          <div>
            <div className="font-bold text-slate-900 leading-tight">Marbefa</div>
            <div className="text-[11px] text-slate-500 leading-tight">Poultry Analytics</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {visibleLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === link.to
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FontAwesomeIcon icon={link.icon} className="w-4 h-4" />
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-200">
          <div className="flex items-center gap-2 mb-2 px-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-900 truncate">{user?.username}</div>
              <div className="text-[11px] text-slate-500">{user?.role}</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <FontAwesomeIcon icon={faRightFromBracket} className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <nav className="lg:hidden bg-primary text-white shadow-md sticky top-0 z-40">
        <div className="px-4 h-14 flex items-center justify-between">
          <Link to="/" className="font-bold text-lg flex items-center gap-2">
            <FontAwesomeIcon icon={faDrumstickBite} />
            Marbefa
          </Link>
          <button
            onClick={logout}
            className="bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-md text-sm"
          >
            <FontAwesomeIcon icon={faRightFromBracket} />
          </button>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 flex justify-around py-1.5">
        {visibleLinks.slice(0, 5).map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-md ${
              location.pathname === link.to ? 'text-primary' : 'text-slate-500'
            }`}
          >
            <FontAwesomeIcon icon={link.icon} className="w-4 h-4" />
            <span className="text-[10px] font-medium">{link.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
