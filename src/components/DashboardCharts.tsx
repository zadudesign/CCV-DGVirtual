import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Curso } from '../types';
import { useNavigate } from 'react-router-dom';
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
  Cell,
  LabelList 
} from 'recharts';
import { Loader2, Bell, AlertTriangle, AlertCircle, Info, Clock } from 'lucide-react';

import TasksStatsBar from './TasksStatsBar';

interface DashboardChartsProps {
  user: User;
}

export default function DashboardCharts({ user }: DashboardChartsProps) {
  const navigate = useNavigate();
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [novedades, setNovedades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [user.id, user.facultad, user.programa]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const isAdmin = user.role === 'admin' || user.role === 'team' || 
                      ['Soporte', 'Multimedia', 'Diseño', 'Pedagogía'].includes(user.role);
      
      // 1. Fetch Cursos Activos
      let cursosQuery = supabase.from('cursos').select('*').neq('estado', 'Publicado');

      if (!isAdmin) {
        if (user.role === 'decano' && user.facultad) {
          cursosQuery = cursosQuery.eq('facultad', user.facultad);
        } else if (user.role === 'coordinador' && user.programa) {
          cursosQuery = cursosQuery.eq('programa', user.programa);
        } else if (user.role === 'docente') {
          cursosQuery = cursosQuery.eq('docente_id', user.id);
        } else if (user.role === 'evaluador') {
          cursosQuery = cursosQuery.eq('evaluador_id', user.id);
        }
      }

      const { data: cursosData, error: cursosError } = await cursosQuery.order('progreso_general', { ascending: false });
      if (cursosError) throw cursosError;
      
      const activeCursos = cursosData as Curso[] || [];
      setCursos(activeCursos);

      // 2. Fetch Novedades de esos cursos
      if (activeCursos.length > 0) {
        const activeIds = activeCursos.map(c => c.id);
        const { data: novedadesData, error: novedadesError } = await supabase
          .from('novedades_curso')
          .select(`
            *,
            curso:cursos(nombre)
          `)
          .in('curso_id', activeIds)
          .order('created_at', { ascending: false })
          .limit(10);
          
        if (novedadesError && novedadesError.code !== '42P01') throw novedadesError;
        setNovedades(novedadesData || []);
      } else {
        setNovedades([]);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const promedioGlobal = cursos.length > 0 
    ? cursos.reduce((acc, c) => acc + (c.progreso_general || 0), 0) / cursos.length 
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[480px] bg-white rounded-xl border border-muted/20 shadow-sm mb-10">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
          <p className="text-secondary text-sm font-medium">Cargando indicadores de progreso...</p>
        </div>
      </div>
    );
  }

  const getUrgencyIcon = (estado: string) => {
    switch (estado) {
      case 'Crítico': return <AlertTriangle className="h-4 w-4 text-rose-500" />;
      case 'Importante': return <AlertCircle className="h-4 w-4 text-amber-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-10">
      {/* Columna 1: Tareas y Novedades (1/4) */}
      <div className="flex flex-col gap-6 h-[480px]">
        {/* Superior: Tareas */}
        <div className="shrink-0">
          <TasksStatsBar user={user} />
        </div>

        {/* Inferior: Novedades */}
        <div className="flex-1 bg-white rounded-xl border border-muted/20 shadow-md flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-50 shrink-0">
            <div className="flex items-center justify-between mb-0.5">
              <h3 className="text-[10px] font-bold text-secondary uppercase tracking-widest">Comunicación</h3>
              <Bell className="h-4 w-4 text-primary" />
            </div>
            <p className="text-base font-bold text-primary">Novedades Recientes</p>
          </div>
          
          <div className="flex-1 overflow-y-auto px-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent pb-2">
            {novedades.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-secondary p-4 text-center">
                <Clock className="h-6 w-6 text-slate-200 mb-2" />
                <p className="text-[10px] italic">No hay novedades registradas recientemente.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {novedades.map((novedad) => (
                  <div key={novedad.id} className="p-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-2 mb-1">
                      {getUrgencyIcon(novedad.estado)}
                      <span className="text-[11px] font-bold text-text-main leading-tight line-clamp-1">{novedad.titulo}</span>
                    </div>
                    <p className="text-[9px] text-secondary line-clamp-2 mb-1.5 leading-relaxed">
                      {novedad.comentario}
                    </p>
                    <div className="flex items-center justify-between mt-auto">
                      <button 
                        onClick={() => navigate(`/cursos/${novedad.curso_id}`)}
                        className="text-[8px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded truncate max-w-[130px] hover:bg-primary/20 transition-colors cursor-pointer"
                      >
                        {novedad.curso?.nombre}
                      </button>
                      <span className="text-[8px] text-slate-400 font-medium">
                        {new Date(novedad.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Columna 2: Progreso Individual (2/4) */}
      <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-muted/20 shadow-md flex flex-col h-[480px]">
        <div className="mb-4">
          <h3 className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">Rendimiento por Curso</h3>
          <p className="text-lg font-bold text-primary">Progreso de Cursos Activos</p>
        </div>
        
        <div className="flex-1 w-full overflow-hidden">
          {cursos.length === 0 ? (
            <div className="h-full flex items-center justify-center text-secondary text-sm italic">
              No hay cursos activos en construcción actualmente.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={cursos.slice(0, 12)} 
                margin={{ top: 5, right: 40, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis 
                  type="category" 
                  dataKey="nombre" 
                  width={180} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={(props) => {
                    const { x, y, payload } = props;
                    const curso = cursos.find(c => c.nombre === payload.value);
                    if (!curso) return null;
                    
                    return (
                      <foreignObject x={x - 180} y={y - 10} width={170} height={20}>
                        <div className="flex justify-end pr-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/cursos/${curso.id}`);
                            }}
                            className="text-[9px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded truncate max-w-[160px] hover:bg-primary/20 transition-colors cursor-pointer text-right uppercase tracking-tight"
                            title={payload.value}
                          >
                            {payload.value.length > 25 ? `${payload.value.substring(0, 25)}...` : payload.value}
                          </button>
                        </div>
                      </foreignObject>
                    );
                  }}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
                  formatter={(value: number) => [`${value}%`, 'Progreso']}
                  labelStyle={{ fontWeight: 'bold', color: '#2d4c7c', marginBottom: '4px' }}
                />
                <Bar 
                  dataKey="progreso_general" 
                  radius={[0, 6, 6, 0]} 
                  barSize={12}
                >
                  <LabelList 
                    dataKey="progreso_general" 
                    position="right" 
                    formatter={(val: number) => `${val}%`} 
                    style={{ fill: '#64748b', fontSize: '9px', fontWeight: 'bold' }} 
                  />
                  {cursos.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.progreso_general >= 80 ? '#059669' : entry.progreso_general >= 40 ? '#2d4c7c' : '#f59e0b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Columna 3: Promedio Global (1/4) */}
      <div className="bg-white p-6 rounded-xl border border-muted/20 shadow-md flex flex-col items-center justify-center h-[480px]">
        <div className="mb-4 text-center">
          <h3 className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">Indicador de Avance</h3>
          <p className="text-lg font-bold text-primary">Promedio Global</p>
        </div>
        
        <div className="relative w-full h-56 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart 
              cx="50%" cy="50%" 
              innerRadius="80%" outerRadius="100%" 
              barSize={16} 
              data={[{ name: 'Global', value: promedioGlobal, fill: '#2d4c7c' }]} 
              startAngle={90} endAngle={-270}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
              <RadialBar background={{ fill: '#f1f5f9' }} dataKey="value" cornerRadius={10} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className="text-4xl font-extrabold text-primary">{promedioGlobal.toFixed(0)}%</span>
            <span className="text-[9px] font-bold text-secondary uppercase mt-0.5 tracking-tighter">Completado</span>
          </div>
        </div>
      </div>
    </div>
  );
}
