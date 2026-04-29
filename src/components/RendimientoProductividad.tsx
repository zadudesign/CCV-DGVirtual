import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, AlertCircle, TrendingUp, TrendingDown, Clock, CalendarCheck } from 'lucide-react';
import { differenceInDays, parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TareaRendimiento {
  id: string;
  titulo: string;
  fecha_inicial: string | null;
  fecha_vencimiento: string;
  fecha_completada: string | null;
  estado: string;
  rol_destino: string;
}

export default function RendimientoProductividad({ cursoId }: { cursoId: string }) {
  const [tareas, setTareas] = useState<TareaRendimiento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTareas();
  }, [cursoId]);

  const fetchTareas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notificaciones_tareas')
        .select('*')
        .eq('curso_id', cursoId)
        .not('fecha_vencimiento', 'is', null)
        .order('fecha_vencimiento', { ascending: true });

      if (error && error.code !== '42P01') throw error;
      setTareas(data || []);
    } catch (error) {
      console.error('Error fetching tareas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  // Filter tasks that have both target and completion dates, or at least target dates?
  // Dumbbell plots usually compare two points. If something isn't completed yet, we can't show actual completion,
  // but maybe we can show "Today" as actual if it's delayed, or just not show the second dot.
  // We should also show tasks that are pending.
  
  const completedTasks = tareas.filter(t => t.estado === 'Completada' || t.estado === 'Completado' || t.fecha_completada !== null);
  const pendingTasks = tareas.filter(t => !(t.estado === 'Completada' || t.estado === 'Completado' || t.fecha_completada !== null));

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-slate-800">Rendimiento y Productividad</h2>
          <p className="text-secondary text-sm mt-1">
            Análisis comparativo entre la fecha propuesta de entrega y la fecha real de completitud de las tareas. (Dumbbell Plot)
          </p>
        </div>

        <div className="space-y-6">
          {/* Gráfico Dumbbell personalizado */}
          <div className="relative pt-6 pb-12 overflow-x-auto">
            {tareas.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-secondary">No hay tareas programadas para este curso.</p>
              </div>
            ) : (
              <DumbbellChart tasks={tareas} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const DumbbellChart = ({ tasks }: { tasks: TareaRendimiento[] }) => {
  // Configuración de escalas de fecha
  const allDates = tasks.map(t => new Date(t.fecha_inicial || t.fecha_vencimiento).getTime());
  tasks.forEach(t => {
    if (t.fecha_completada) {
      allDates.push(new Date(t.fecha_completada).getTime());
    } else {
      allDates.push(new Date().getTime()); // For pending, compare to today
    }
  });

  const minDate = Math.min(...allDates);
  const maxDate = Math.max(...allDates);
  const timeRange = maxDate - minDate;

  // Add some padding to min/max
  const padding = timeRange === 0 ? (1000 * 60 * 60 * 24 * 7) : timeRange * 0.1;
  const startGraph = minDate - padding;
  const endGraph = maxDate + padding;
  const totalRange = endGraph - startGraph;

  const getPosition = (dateStr: string | null) => {
    if (!dateStr) return null;
    const time = new Date(dateStr).getTime();
    return ((time - startGraph) / totalRange) * 100;
  };

  const getTodayPosition = () => {
    return ((new Date().getTime() - startGraph) / totalRange) * 100;
  };

  return (
    <div className="min-w-[700px] mt-4">
      <div className="flex justify-between text-xs font-bold text-slate-400 border-b border-slate-100 pb-2 mb-4 px-4 uppercase tracking-wider">
        <div className="w-1/3">Tarea / Novedad</div>
        <div className="flex-1 relative flex justify-between">
          <span>Temprano</span>
          <span>Cronograma Ideal</span>
          <span>Tardío</span>
        </div>
      </div>
      
      <div className="space-y-5 px-4 relative">
        {/* Container overlay specifically for vertical guide lines */}
        <div className="absolute inset-0 px-4 pointer-events-none flex">
          <div className="w-1/3 shrink-0"></div>
          <div className="flex-1 relative">
            {/* Today Line */}
            <div 
              className="absolute top-0 bottom-0 border-l-2 border-dashed border-slate-200 z-0"
              style={{ left: `${getTodayPosition()}%` }}
            >
              <div className="absolute -top-6 -translate-x-1/2 text-[10px] font-bold text-slate-400 bg-white px-1">HOY</div>
            </div>
          </div>
        </div>

        {tasks.map((task, idx) => {
          const proposedDateRaw = task.fecha_inicial || task.fecha_vencimiento;
          const propPos = getPosition(proposedDateRaw) || 0;
          const realPos = task.fecha_completada ? getPosition(task.fecha_completada) : getTodayPosition();
          
          if (realPos === null) return null;

          const basePercent = 33.333; // First 1/3 is for labels
          const graphPercent = 66.666;
          
          const leftPoint = Math.min(propPos, realPos);
          const rightPoint = Math.max(propPos, realPos);
          const barWidth = rightPoint - leftPoint;
          
          const isPending = !task.fecha_completada;
          const isDelayed = realPos > propPos;
          const isEarly = realPos < propPos;
          
          const barColor = isPending ? (isDelayed ? 'bg-amber-200' : 'bg-slate-200') : isDelayed ? 'bg-red-200' : 'bg-emerald-200';
          const dotPropColor = 'bg-blue-500 ring-2 ring-white z-10';
          const dotRealColor = isPending ? (isDelayed ? 'bg-amber-400' : 'bg-slate-300') : isDelayed ? 'bg-red-500' : 'bg-emerald-500';

          const diffDays = isPending 
            ? differenceInDays(new Date(), parseISO(proposedDateRaw))
            : differenceInDays(parseISO(task.fecha_completada!), parseISO(proposedDateRaw));

          return (
            <div key={task.id || idx} className="flex relative items-center group h-8">
              <div className="w-1/3 pr-4 truncate z-10 bg-white group-hover:bg-slate-50 transition-colors rounded-l flex items-center h-full">
                <span className="text-sm font-medium text-slate-700 truncate" title={task.titulo}>{task.titulo}</span>
              </div>
              
              <div className="flex-1 relative h-full flex items-center">
                {/* Horizontal line */}
                <div className="absolute left-0 right-0 h-[1px] bg-slate-100 top-1/2 -translate-y-1/2 w-full"></div>

                {/* Connecting bar */}
                <div 
                  className={`absolute h-1.5 ${barColor} rounded-full top-1/2 -translate-y-1/2 opacity-70 group-hover:opacity-100 transition-opacity`}
                  style={{ 
                    left: `${leftPoint}%`, 
                    width: `${barWidth}%`,
                    display: Math.abs(barWidth) < 0.5 ? 'none' : 'block'
                  }}
                />

                {/* Fecha Propuesta Dot */}
                <div 
                  className={`absolute w-3 h-3 rounded-full ${dotPropColor} top-1/2 -translate-y-1/2 shadow-sm`}
                  style={{ left: `calc(${propPos}% - 6px)` }}
                  title={`Propuesta: ${format(parseISO(proposedDateRaw), 'dd MMM yyyy', { locale: es })}`}
                />

                {/* Fecha Real Dot */}
                <div 
                  className={`absolute w-3 h-3 rounded-full ${dotRealColor} ring-2 ring-white z-20 top-1/2 -translate-y-1/2 shadow-sm ${isPending ? 'animate-pulse' : ''}`}
                  style={{ left: `calc(${realPos}% - 6px)` }}
                  title={`${isPending ? 'Hoy/Pendiente' : 'Real'}: ${format(task.fecha_completada ? parseISO(task.fecha_completada) : new Date(), 'dd MMM yyyy', { locale: es })}`}
                />
                
                {/* Differential Label */}
                {Math.abs(diffDays) > 0 && (
                  <div 
                    className={`absolute text-[10px] font-bold top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-full whitespace-nowrap z-30 ${
                      isPending ? (isDelayed ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600') : isDelayed ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                    }`}
                    style={{ 
                      left: `calc(${rightPoint}% + 12px)`,
                    }}
                  >
                    {!isPending && isEarly && `${Math.abs(diffDays)}d temprano`}
                    {!isPending && isDelayed && `+${diffDays}d tarde`}
                    {isPending && isEarly && `${Math.abs(diffDays)}d restantes`}
                    {isPending && isDelayed && `+${diffDays}d retraso`}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-8 flex justify-center flex-wrap gap-6 text-[10px] uppercase font-bold text-slate-500 pt-6 border-t border-slate-100">
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
          Fecha Propuesta
        </div>
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></div>
          Entrega Temprana / Puntual
        </div>
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
          Entrega Tardía
        </div>
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full bg-amber-400 mr-2"></div>
          Pendiente (Retrasado)
        </div>
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full bg-slate-300 mr-2"></div>
          Pendiente (A tiempo)
        </div>
      </div>
    </div>
  );
};
