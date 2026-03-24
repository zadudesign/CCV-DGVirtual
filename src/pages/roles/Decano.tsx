import React from 'react';
import { BarChart3, TrendingUp, Users, BookOpen } from 'lucide-react';

export default function DecanoDashboard() {
  const stats = [
    { name: 'Total Cursos', value: '124', icon: BookOpen, change: '+12%', changeType: 'positive' },
    { name: 'Docentes Activos', value: '45', icon: Users, change: '+4%', changeType: 'positive' },
    { name: 'Cursos en Revisión', value: '12', icon: TrendingUp, change: '-2%', changeType: 'negative' },
    { name: 'Tasa de Aprobación', value: '94%', icon: BarChart3, change: '+1%', changeType: 'positive' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Panel del Decano</h1>
        <p className="mt-1 text-sm text-slate-500">
          Vista general del progreso de construcción de cursos virtuales en la facultad.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <div key={item.name} className="bg-white overflow-hidden shadow-sm rounded-xl border border-slate-200">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <item.icon className="h-6 w-6 text-slate-400" aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-slate-500 truncate">{item.name}</dt>
                    <dd>
                      <div className="text-lg font-medium text-slate-900">{item.value}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 px-5 py-3">
              <div className="text-sm">
                <span className={item.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}>
                  {item.change}
                </span>
                <span className="text-slate-500 ml-2">desde el mes pasado</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-medium text-slate-900 mb-4">Métricas de Integración (ClickUp / Tally)</h2>
        <div className="h-64 bg-slate-50 rounded-lg border border-dashed border-slate-300 flex items-center justify-center">
          <p className="text-slate-500 text-sm">Gráfico de progreso de cursos (D3.js / Recharts placeholder)</p>
        </div>
      </div>
    </div>
  );
}
