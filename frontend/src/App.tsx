import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { useAuthStore } from './stores/authStore';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { LotsList } from './pages/Lots/LotsList';
import { LotDetail } from './pages/Lots/LotDetail';
import { ProducersList } from './pages/Producers/ProducersList';
import { ProducerDetail } from './pages/Producers/ProducerDetail';
import { ShipmentsList } from './pages/Shipments/ShipmentsList';
import { ShipmentDetail } from './pages/Shipments/ShipmentDetail';
import { DocumentsList } from './pages/Documents/DocumentsList';
import { MapPage } from './pages/Map/MapPage';
import { IntelligencePage } from './pages/Intelligence/IntelligencePage';
import { SettingsPage } from './pages/Settings/SettingsPage';
import { NotificationsPage } from './pages/Notifications';
import { LotPublicPage } from './pages/Public/LotPublicPage';
import { ShipmentPublicPage } from './pages/Public/ShipmentPublicPage';
// @ts-ignore – JSX pages
import Conditioning from './pages/Conditioning';
// @ts-ignore – JSX pages
import ConditioningDetail from './pages/ConditioningDetail';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <Routes>
      {/* ── Routes publiques (sans auth) ─────────────────────────── */}
      <Route path="/login" element={<Login />} />
      <Route path="/lot-public/:id" element={<LotPublicPage />} />
      <Route path="/shipment-public/:id" element={<ShipmentPublicPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* ── Routes protégées ─────────────────────────────────────── */}
      <Route path="/dashboard"         element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/lots"              element={<ProtectedRoute><LotsList /></ProtectedRoute>} />
      <Route path="/lots/:id"          element={<ProtectedRoute><LotDetail /></ProtectedRoute>} />
      <Route path="/producers"         element={<ProtectedRoute><ProducersList /></ProtectedRoute>} />
      <Route path="/producers/:id"     element={<ProtectedRoute><ProducerDetail /></ProtectedRoute>} />
      <Route path="/shipments"         element={<ProtectedRoute><ShipmentsList /></ProtectedRoute>} />
      <Route path="/shipments/:id"     element={<ProtectedRoute><ShipmentDetail /></ProtectedRoute>} />
      <Route path="/documents"         element={<ProtectedRoute><DocumentsList /></ProtectedRoute>} />
      <Route path="/map"               element={<ProtectedRoute><MapPage /></ProtectedRoute>} />
      <Route path="/intelligence"      element={<ProtectedRoute><IntelligencePage /></ProtectedRoute>} />
      <Route path="/notifications"     element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
      <Route path="/settings"          element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

      <Route path="/conditioning"     element={<ProtectedRoute><Conditioning /></ProtectedRoute>} />
      <Route path="/conditioning/:id" element={<ProtectedRoute><ConditioningDetail /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
