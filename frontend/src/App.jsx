import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DailyLogForm from './pages/DailyLogForm';
import Batches from './pages/Batches';
import Alerts from './pages/Alerts';
import Forecast from './pages/Forecast';

function AppRoutes() {
  const { user } = useAuth();
  return (
    <BrowserRouter basename="/marbefapoultry">
      {user && <Navbar />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/daily-log" element={<ProtectedRoute><DailyLogForm /></ProtectedRoute>} />
        <Route path="/batches" element={<ProtectedRoute managerOnly><Batches /></ProtectedRoute>} />
        <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
        <Route path="/forecast" element={<ProtectedRoute managerOnly><Forecast /></ProtectedRoute>} />
      </Routes>
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
