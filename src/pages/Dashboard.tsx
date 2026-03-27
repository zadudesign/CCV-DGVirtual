import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import AdminDashboard from './roles/Admin';
import DecanoDashboard from './roles/Decano';
import CoordinadorDashboard from './roles/Coordinador';
import DocenteDashboard from './roles/Docente';
import EvaluadorDashboard from './roles/Evaluador';
import TeamDashboard from './roles/Team';

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) return null;

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
      return <TeamDashboard />;
    default:
      return <div>Rol no reconocido</div>;
  }
}
