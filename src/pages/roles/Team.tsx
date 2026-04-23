import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import StatsBar from '../../components/StatsBar';
import TasksStatsBar from '../../components/TasksStatsBar';
import DashboardCharts from '../../components/DashboardCharts';

export default function TeamDashboard() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div>
        <h1 className="text-2xl font-bold text-text-main">Panel de Equipo Team</h1>
        <p className="mt-1 text-sm text-secondary">
          Gestión de usuarios, facultades y programas de la plataforma CCV.
        </p>
      </div>

      <StatsBar user={user} />
      <TasksStatsBar user={user} />
      <DashboardCharts user={user} />
    </div>
  );
}
