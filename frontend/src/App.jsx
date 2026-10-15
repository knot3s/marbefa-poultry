import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DailyLogForm from './pages/DailyLogForm';
import DailyLogs from './pages/DailyLogs';
import Batches from './pages/Batches';
import Alerts from './pages/Alerts';
import Forecast from './pages/Forecast';
import Reports from './pages/Reports';
import Users from './pages/Users';

function AppRoutes() {
  const { user } = useAuth();
  // Asset base is e.g. /marbefapoultry/dist/ — strip /dist to get the app URL base
  const assetBase = import.meta.env.BASE_URL || '/';
  const basename = assetBase.replace(/\/dist\/?$/, '').replace(/\/$/, '');
  return (
    <BrowserRouter basename={basename}>
      {user && <Navbar />}
      <div className={`${user ? 'lg:ml-60' : ''} pb-20 md:pb-0`}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/daily-log" element={<ProtectedRoute><DailyLogForm /></ProtectedRoute>} />
          <Route path="/daily-logs" element={<ProtectedRoute><DailyLogs /></ProtectedRoute>} />
          <Route path="/batches" element={<ProtectedRoute managerOnly><Batches /></ProtectedRoute>} />
          <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
          <Route path="/forecast" element={<ProtectedRoute managerOnly><Forecast /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute managerOnly><Users /></ProtectedRoute>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
