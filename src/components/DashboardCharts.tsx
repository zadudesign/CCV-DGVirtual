import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Curso } from '../types';
import { 
  ResponsiveContainer, 
  RadialBarChart, 
  RadialBar, 
  PolarAngleAxis, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Cell 
} from 'recharts';
import { Loader2 } from 'lucide-react';

interface DashboardChartsProps {
  user: User;
}

export default function DashboardCharts({ user }: DashboardChartsProps) {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCursos();
  }, [user.id, user.facultad, user.programa]);

  const fetchCursos = async () => {
    try {
      setLoading(true);
      const isAdmin = user.role === 'admin' || user.role === 'team' || 
                      ['Soporte', 'Multimedia', 'Diseño', 'Pedagogía'].includes(user.role);
      
      // Filtramos por cursos con progreso (activos en construcción)
      // Excluimos 'Publicado' y 'Planificación' (solicitudes)
      let query = supabase.from('cursos').select('*').in('estado', ['En Desarrollo', 'Revisión']);

      if (!isAdmin) {
        if (user.role === 'decano' && user.facultad) {
          query = query.eq('facultad', user.facultad);
        } else if (user.programa) {
          query = query.eq('programa', user.programa);
        }
      }

      const { data, error } = await query.order('progreso', { ascending: false });
      if (error) throw error;
      setCursos(data as Curso[] || []);
    } catch (error) {
      console.error('Error fetching courses for charts:', error);
    } finally {
      setLoading(false);
    }
  };

  const promedioGlobal = cursos.length > 0 
    ? cursos.reduce((acc, c) => acc + (c.progreso || 0), 0) / cursos.length 
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-80 bg-white rounded-xl border border-muted/20 shadow-sm mb-10">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
          <p className="text-secondary text-sm font-medium">Cargando indicadores de progreso...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
      {/* Columna 1: Promedio Global (1/3) */}
      <div className="bg-white p-6 rounded-xl border border-muted/20 shadow-md flex flex-col items-center justify-center min-h-[400px]">
        <div className="mb-6 text-center">
          <h3 className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">Indicador de Avance</h3>
          <p className="text-lg font-bold text-primary">Promedio Global</p>
        </div>
        
        <div className="relative w-full h-56 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart 
              cx="50%" cy="50%" 
              innerRadius="80%" outerRadius="100%" 
              barSize={20} 
              data={[{ name: 'Global', value: promedioGlobal, fill: '#2d4c7c' }]} 
              startAngle={90} endAngle={-270}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
              <RadialBar background={{ fill: '#f1f5f9' }} dataKey="value" cornerRadius={10} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className="text-5xl font-extrabold text-primary">{promedioGlobal.toFixed(0)}%</span>
            <span className="text-[10px] font-bold text-secondary uppercase mt-1 tracking-tighter">Completado</span>
          </div>
        </div>
        
        <div className="mt-8 grid grid-cols-2 gap-4 w-full border-t border-slate-100 pt-6">
          <div className="text-center">
            <p className="text-secondary text-[10px] uppercase font-bold tracking-wider">Cursos</p>
            <p className="text-xl font-bold text-primary">{cursos.length}</p>
          </div>
          <div className="text-center border-l border-slate-100">
            <p className="text-secondary text-[10px] uppercase font-bold tracking-wider">Estado</p>
            <p className="text-xs font-bold text-emerald-600 mt-1">Activos</p>
          </div>
        </div>
      </div>

      {/* Columna 2: Progreso Individual (2/3) */}
      <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-muted/20 shadow-md flex flex-col min-h-[400px]">
        <div className="mb-6">
          <h3 className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">Rendimiento por Curso</h3>
          <p className="text-lg font-bold text-primary">Progreso Individual de Cursos Activos</p>
        </div>
        
        <div className="flex-1 w-full min-h-[300px]">
          {cursos.length === 0 ? (
            <div className="h-full flex items-center justify-center text-secondary text-sm italic">
              No hay cursos activos en construcción actualmente.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={cursos.slice(0, 10)} 
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis 
                  type="category" 
                  dataKey="nombre" 
                  width={150} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={(props) => {
                    const { x, y, payload } = props;
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text
                          x={-10}
                          y={0}
                          dy={4}
                          textAnchor="end"
                          fill="#64748b"
                          className="text-[10px] font-bold uppercase tracking-tight"
                        >
                          {payload.value.length > 20 ? `${payload.value.substring(0, 20)}...` : payload.value}
                        </text>
                      </g>
                    );
                  }}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                  formatter={(value: number) => [`${value}%`, 'Progreso']}
                  labelStyle={{ fontWeight: 'bold', color: '#2d4c7c', marginBottom: '4px' }}
                />
                <Bar 
                  dataKey="progreso" 
                  radius={[0, 6, 6, 0]} 
                  barSize={18}
                >
                  {cursos.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.progreso >= 80 ? '#059669' : entry.progreso >= 40 ? '#2d4c7c' : '#f59e0b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        
        {cursos.length > 10 && (
          <p className="text-[10px] text-secondary italic text-right mt-2">
            Mostrando los 10 cursos con mayor avance
          </p>
        )}
      </div>
    </div>
  );
}
