import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import StatsBar from '../../components/StatsBar';

export default function DocenteDashboard() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div>
        <h1 className="text-2xl font-bold text-text-main">Panel del Docente</h1>
        <p className="mt-1 text-sm text-secondary">
          Sube tus materiales, completa formularios y sigue el progreso de tus cursos asignados.
        </p>
      </div>

      <StatsBar user={user} />
    </div>
  );
}
