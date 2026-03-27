import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, Users } from 'lucide-react';

export default function TeamDashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Panel de Equipo</h1>
        <p className="mt-1 text-sm text-slate-500">
          Bienvenido al área de {user?.team_area || 'Trabajo'}.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Shield className="h-6 w-6 text-orange-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Mis Tareas</h2>
          </div>
          <p className="text-slate-600 text-sm">
            Aquí podrás ver las tareas asignadas a tu área de {user?.team_area}.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Users className="h-6 w-6 text-indigo-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Directorio</h2>
          </div>
          <p className="text-slate-600 text-sm">
            Accede al directorio de usuarios de la plataforma.
          </p>
        </div>
      </div>
    </div>
  );
}
