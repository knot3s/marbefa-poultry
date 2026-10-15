import { Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGaugeHigh,
  faClipboardList,
  faDrumstickBite,
  faTriangleExclamation,
  faChartLine,
  faRightFromBracket,
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout, isManager } = useAuth();
  const location = useLocation();

  const links = [
    { to: '/', label: 'Dashboard', icon: faGaugeHigh },
    { to: '/daily-log', label: 'Daily Log', icon: faClipboardList },
    { to: '/batches', label: 'Batches', icon: faDrumstickBite, managerOnly: true },
    { to: '/alerts', label: 'Alerts', icon: faTriangleExclamation },
    { to: '/forecast', label: 'Forecast', icon: faChartLine, managerOnly: true },
  ];

  const visibleLinks = links.filter((l) => !l.managerOnly || isManager);

  return (
    <nav className="bg-primary text-white shadow-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link to="/" className="font-bold text-lg tracking-tight flex items-center gap-2">
            <FontAwesomeIcon icon={faDrumstickBite} />
            Marbefa Poultry
          </Link>
          <div className="hidden md:flex items-center space-x-1">
            {visibleLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === link.to
                    ? 'bg-primary-dark'
                    : 'hover:bg-primary-dark'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm hidden sm:inline">
              {user?.username} <span className="opacity-70">({user?.role})</span>
            </span>
            <button
              onClick={logout}
              className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5"
            >
              <FontAwesomeIcon icon={faRightFromBracket} />
              Logout
            </button>
          </div>
        </div>
        {/* Mobile nav */}
        <div className="md:hidden flex overflow-x-auto pb-2 gap-1">
          {visibleLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`whitespace-nowrap px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 ${
                location.pathname === link.to ? 'bg-primary-dark' : 'hover:bg-primary-dark'
              }`}
            >
              <FontAwesomeIcon icon={link.icon} />
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
