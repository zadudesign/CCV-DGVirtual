import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, BookOpen, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Curso } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import StatsBar from '../../components/StatsBar';

export default function DecanoDashboard() {
  const { user } = useAuth();
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.facultad) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch cursos de la facultad
      const { data: cursosData, error: cursosError } = await supabase
        .from('cursos')
        .select('*')
        .eq('facultad', user?.facultad);
        
      if (cursosError) throw cursosError;
      setCursos(cursosData as Curso[] || []);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const totalCursos = cursos.length;
  const cursosRevision = cursos.filter(c => c.estado === 'Revisión').length;
  const cursosPublicados = cursos.filter(c => c.estado === 'Publicado').length;
  
  const stats = [
    { name: 'Total Cursos', value: totalCursos.toString(), icon: BookOpen, color: 'text-primary', bg: 'bg-primary/20' },
    { name: 'Docentes Activos', value: docentesCount.toString(), icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    { name: 'Cursos en Revisión', value: cursosRevision.toString(), icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-100' },
    { name: 'Cursos Publicados', value: cursosPublicados.toString(), icon: BarChart3, color: 'text-green-600', bg: 'bg-green-100' },
  ];

  // Prepare data for chart
  const statusCounts = cursos.reduce((acc, curso) => {
    acc[curso.estado] = (acc[curso.estado] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = [
    { name: 'Planificación', cantidad: statusCounts['Planificación'] || 0, color: '#94a3b8' },
    { name: 'En Desarrollo', cantidad: statusCounts['En Desarrollo'] || 0, color: '#3b82f6' },
    { name: 'Revisión', cantidad: statusCounts['Revisión'] || 0, color: '#f59e0b' },
    { name: 'Publicado', cantidad: statusCounts['Publicado'] || 0, color: '#10b981' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-main">Panel del Decano</h1>
        <p className="mt-1 text-sm text-secondary">
          Vista general del progreso de construcción de cursos virtuales en la facultad de {user?.facultad}.
        </p>
      </div>

      <StatsBar user={user} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow-sm rounded-xl border border-muted/30 p-6">
          <h2 className="text-lg font-medium text-text-main mb-6">Estado de los Cursos</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} allowDecimals={false} />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="cantidad" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-xl border border-muted/30 overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-muted/30">
            <h2 className="text-lg font-medium text-text-main">Cursos Recientes</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-0">
            {cursos.length === 0 ? (
              <div className="p-6 text-center text-secondary text-sm">No hay cursos registrados en esta facultad.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {cursos.slice(0, 5).map((curso) => (
                  <li key={curso.id} className="p-6 hover:bg-background transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-text-main">{curso.nombre}</p>
                        <p className="text-xs text-secondary mt-1">{curso.programa}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          curso.estado === 'Publicado' ? 'bg-green-100 text-green-800' :
                          curso.estado === 'Revisión' ? 'bg-amber-100 text-amber-800' :
                          curso.estado === 'En Desarrollo' ? 'bg-blue-100 text-blue-800' :
                          'bg-slate-100 text-text-main'
                        }`}>
                          {curso.estado}
                        </span>
                        <span className="text-xs font-medium text-secondary mt-2">{curso.progreso}% completado</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
