import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AdminDashboard from './roles/Admin';
import DecanoDashboard from './roles/Decano';
import CoordinadorDashboard from './roles/Coordinador';
import DocenteDashboard from './roles/Docente';
import EvaluadorDashboard from './roles/Evaluador';
import TeamDashboard from './roles/Team';
import WelcomeModal from '../components/WelcomeModal';

export default function Dashboard() {
  const { user } = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (user && !sessionStorage.getItem('welcome_shown')) {
      setShowWelcome(true);
      sessionStorage.setItem('welcome_shown', 'true');
    }
  }, [user]);

  if (!user) return null;

  const renderDashboard = () => {
    switch (user.role) {
      case 'admin':
        return <AdminDashboard />;
      case 'decano':
        return <DecanoDashboard />;
      case 'coordinador':
        return <CoordinadorDashboard />;
      case 'docente':
        return <DocenteDashboard />;
      case 'evaluador':
        return <EvaluadorDashboard />;
      case 'team':
      case 'Soporte':
      case 'Multimedia':
      case 'Diseño':
      case 'Pedagogía':
        return <TeamDashboard />;
      default:
        return <div>Rol no reconocido</div>;
    }
  };

  return (
    <>
      {showWelcome && <WelcomeModal user={user} onClose={() => setShowWelcome(false)} />}
      {renderDashboard()}
    </>
  );
}
