import React, { useState, useEffect } from 'react';
import { CalendarDays, Clock, CheckCircle, AlertCircle, Loader2, ChevronLeft, ChevronRight, Bell } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { EntregaCalendario } from '../types';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths, 
  parseISO,
  differenceInDays,
  startOfDay
} from 'date-fns';
import { es } from 'date-fns/locale';

export default function Calendario({ cursoId }: { cursoId?: string }) {
  const { user } = useAuth();
  const [entregas, setEntregas] = useState<EntregaCalendario[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    if (user) {
      fetchEntregas();
    }
  }, [user, cursoId]);

  const fetchEntregas = async () => {
    try {
      setLoading(true);
      
      let cursosQuery = supabase.from('cursos').select('id');
      
      if (cursoId) {
        cursosQuery = cursosQuery.eq('id', cursoId);
      } else {
        if (user?.role === 'docente') {
          cursosQuery = cursosQuery.eq('docente_id', user.id);
        } else if (user?.role === 'evaluador') {
          cursosQuery = cursosQuery.eq('evaluador_id', user.id);
        } else if (user?.role === 'creador') {
          cursosQuery = cursosQuery.eq('creador_id', user.id);
        }
      }
      
      const { data: cursos, error: cursosError } = await cursosQuery;
      if (cursosError) throw cursosError;
      
      if (!cursos || cursos.length === 0) {
        setEntregas([]);
        return;
      }

      const cursoIds = cursos.map(c => c.id);

      const { data: entregasData, error: entregasError } = await supabase
        .from('calendario_entregas')
        .select(`
          *,
          curso:cursos(nombre)
        `)
        .in('curso_id', cursoIds);

      if (entregasError) {
        if (entregasError.code === '42P01') {
          console.log('La tabla calendario_entregas aún no existe.');
          setEntregas([]);
          return;
        }
        throw entregasError;
      }
      
      const events: any[] = [];
      
      (entregasData || []).forEach((row: any) => {
        const addEvent = (titulo: string, fecha: string | null, estado: string | null, detalle: string | null) => {
          if (fecha) {
            events.push({
              id: `${row.id}-${titulo}`,
              curso_id: row.curso_id,
              titulo,
              fecha_entrega: fecha,
              estado: estado || 'Pendiente',
              detalle: detalle || '',
              curso: row.curso
            });
          }
        };

        addEvent('Solicitud de Creación', row.solicitud_creacion, row.estado_solicitud_creacion, row.detalle_solicitud_creacion);
        addEvent('Asesorías', row.asesorias, row.estado_asesorias, row.detalle_asesorias);
        addEvent('Sílabo Virtual', row.silabo_virtual, row.estado_silabo_virtual, row.detalle_silabo_virtual);
        addEvent('Unidad 1', row.unidad_1, row.estado_unidad_1, row.detalle_unidad_1);
        addEvent('Unidad 2', row.unidad_2, row.estado_unidad_2, row.detalle_unidad_2);
        addEvent('Unidad 3', row.unidad_3, row.estado_unidad_3, row.detalle_unidad_3);
        addEvent('Unidad 4', row.unidad_4, row.estado_unidad_4, row.detalle_unidad_4);
        addEvent('Unidad 5', row.unidad_5, row.estado_unidad_5, row.detalle_unidad_5);
        addEvent('Revisión y Entrega', row.revision_entrega, row.estado_revision_entrega, row.detalle_revision_entrega);
      });

      setEntregas(events);
    } catch (error) {
      console.error('Error fetching entregas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (curso_id: string, titulo: string, newStatus: string) => {
    // Optimistic update
    setEntregas(prev => prev.map(e => 
      (e.curso_id === curso_id && e.titulo === titulo) ? { ...e, estado: newStatus } : e
    ));

    const columnMap: Record<string, string> = {
      'Solicitud de Creación': 'estado_solicitud_creacion',
      'Asesorías': 'estado_asesorias',
      'Sílabo Virtual': 'estado_silabo_virtual',
      'Unidad 1': 'estado_unidad_1',
      'Unidad 2': 'estado_unidad_2',
      'Unidad 3': 'estado_unidad_3',
      'Unidad 4': 'estado_unidad_4',
      'Unidad 5': 'estado_unidad_5',
      'Revisión y Entrega': 'estado_revision_entrega',
    };

    const columnName = columnMap[titulo];
    if (!columnName) return;

    try {
      const { error } = await supabase
        .from('calendario_entregas')
        .update({ [columnName]: newStatus })
        .eq('curso_id', curso_id);
        
      if (error) throw error;
    } catch (error) {
      console.error('Error updating status:', error);
      fetchEntregas();
    }
  };

  const getTrafficLightStatus = (fecha: string, estado: string) => {
    if (estado === 'Completado') {
      return {
        color: 'bg-slate-100 text-slate-600 border-slate-300 opacity-75',
        iconBg: 'bg-slate-400',
        label: 'Completado'
      };
    }

    const today = startOfDay(new Date());
    const dueDate = startOfDay(parseISO(fecha));
    const diffDays = differenceInDays(dueDate, today);

    if (diffDays < 0) {
      const daysLate = Math.abs(diffDays);
      return {
        color: 'bg-red-100 text-red-800 border-red-200',
        iconBg: 'bg-red-500',
        label: `Vencido (${daysLate} día${daysLate === 1 ? '' : 's'} de retraso)`
      };
    } else if (diffDays <= 3) {
      return {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        iconBg: 'bg-yellow-500',
        label: 'Pronto a vencer'
      };
    } else {
      return {
        color: 'bg-green-100 text-green-800 border-green-200',
        iconBg: 'bg-green-500',
        label: 'A tiempo'
      };
    }
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900 capitalize">
          {format(currentDate, 'MMMM yyyy', { locale: es })}
        </h2>
        <div className="flex items-center space-x-2">
          <button 
            onClick={goToToday}
            className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
          >
            Hoy
          </button>
          <div className="flex items-center bg-white border border-slate-300 rounded-md">
            <button 
              onClick={prevMonth}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-l-md"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="w-px h-5 bg-slate-300"></div>
            <button 
              onClick={nextMonth}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-r-md"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = [];
    const startDate = startOfWeek(currentDate, { weekStartsOn: 0 }); // 0 = Sunday

    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={i} className="py-2 text-center text-sm font-semibold text-slate-700 bg-slate-50 border-b border-slate-200 capitalize">
          {format(addDays(startDate, i), 'EEEE', { locale: es })}
        </div>
      );
    }

    return <div className="grid grid-cols-7">{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = '';

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, 'd');
        const cloneDay = day;
        
        // Find events for this day
        const dayEvents = entregas.filter(entrega => {
          // Parse the ISO date string (YYYY-MM-DD) and compare
          const entregaDate = parseISO(entrega.fecha_entrega);
          return isSameDay(entregaDate, cloneDay);
        });

        const isCurrentMonth = isSameMonth(day, monthStart);
        const isToday = isSameDay(day, new Date());

        days.push(
          <div
            key={day.toString()}
            className={`min-h-[120px] p-2 border-b border-r border-slate-200 ${
              !isCurrentMonth ? 'bg-slate-50/50 text-slate-400' : 'bg-white text-slate-900'
            } ${isToday ? 'bg-indigo-50/30' : ''}`}
          >
            <div className="flex justify-end">
              <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${
                isToday ? 'bg-indigo-600 text-white' : ''
              }`}>
                {formattedDate}
              </span>
            </div>
            <div className="mt-2 space-y-1.5">
              {dayEvents.map((event, idx) => {
                const status = getTrafficLightStatus(event.fecha_entrega, event.estado);
                return (
                  <div 
                    key={event.id || idx} 
                    className={`px-2 py-1.5 text-xs rounded-md border ${status.color}`}
                    title={`${event.curso?.nombre} - ${event.titulo}\n${status.label}`}
                  >
                    <div className="font-semibold truncate">{event.titulo}</div>
                    <div className="truncate opacity-80">{event.curso?.nombre}</div>
                    {event.detalle && (
                      <div className="mt-1 bg-white/60 rounded px-1.5 py-1 text-[9px] text-slate-700 border border-black/5 flex items-start gap-1">
                        <div className={`flex-shrink-0 w-3 h-3 rounded-full flex items-center justify-center ${status.iconBg}`}>
                          <Bell className="w-2 h-2 text-white" />
                        </div>
                        <span className="truncate leading-tight">{event.detalle}</span>
                      </div>
                    )}
                    <div className="text-[10px] mt-1 font-medium italic opacity-90 truncate">{status.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="border-l border-t border-slate-200 rounded-b-xl overflow-hidden">{rows}</div>;
  };

  const renderSidebar = () => {
    const vencidas: any[] = [];
    const pronto: any[] = [];
    const aTiempo: any[] = [];

    const today = startOfDay(new Date());

    entregas.forEach(event => {
      if (event.estado === 'Completado') {
        // We can skip completed events from the sidebar, or put them in a separate list.
        // For now, let's just skip them so the sidebar focuses on pending work.
        return;
      }

      const dueDate = startOfDay(parseISO(event.fecha_entrega));
      const diffDays = differenceInDays(dueDate, today);

      if (diffDays < 0) {
        vencidas.push(event);
      } else if (diffDays <= 3) {
        pronto.push(event);
      } else {
        aTiempo.push(event);
      }
    });

    const sortByDate = (a: any, b: any) => {
      return new Date(a.fecha_entrega).getTime() - new Date(b.fecha_entrega).getTime();
    };

    vencidas.sort(sortByDate);
    pronto.sort(sortByDate);
    aTiempo.sort(sortByDate);

    const renderList = (title: string, events: any[], colorClass: string, bgClass: string) => (
      <div className="mb-6 last:mb-0">
        <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 flex items-center ${colorClass}`}>
          <div className={`w-2 h-2 rounded-full mr-2 ${bgClass}`}></div>
          {title} ({events.length})
        </h3>
        <div className="space-y-3">
          {events.length === 0 ? (
            <p className="text-sm text-slate-500 italic">No hay tareas en esta sección</p>
          ) : (
            events.map((event, idx) => {
              const status = getTrafficLightStatus(event.fecha_entrega, event.estado);
              return (
                <div key={event.id || idx} className={`p-3 rounded-lg border ${status.color}`}>
                  <div className="font-semibold text-sm">{event.titulo}</div>
                  <div className="text-xs opacity-80 mt-0.5">{event.curso?.nombre}</div>
                  {event.detalle && (
                    <div className="mt-1.5 bg-white/60 rounded px-2 py-1.5 text-[10px] text-slate-700 border border-black/5 flex items-start gap-1.5">
                      <div className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${status.iconBg}`}>
                        <Bell className="w-2.5 h-2.5 text-white" />
                      </div>
                      <span className="leading-tight">{event.detalle}</span>
                    </div>
                  )}
                  <div className="text-xs font-medium mt-2 flex items-center justify-between">
                    <span>{format(parseISO(event.fecha_entrega), 'dd MMM yyyy', { locale: es })}</span>
                    <span className="italic opacity-90 text-[10px] text-right ml-2">{status.label}</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-black/10">
                    <select
                      value={event.estado}
                      onChange={(e) => handleStatusChange(event.curso_id, event.titulo, e.target.value)}
                      className="w-full text-xs border-slate-300 rounded bg-white/50 text-slate-800 focus:ring-indigo-500 focus:border-indigo-500 py-1 px-2 cursor-pointer"
                    >
                      <option value="Pendiente">Pendiente</option>
                      <option value="En Progreso">En Progreso</option>
                      <option value="Completado">Completado</option>
                    </select>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );

    return (
      <div className="bg-white shadow-sm rounded-xl border border-slate-200 p-5 max-h-[calc(100vh-12rem)] overflow-y-auto sticky top-6">
        {renderList('Tareas Vencidas', vencidas, 'text-red-700', 'bg-red-500')}
        {renderList('Pronto a Vencer', pronto, 'text-yellow-700', 'bg-yellow-500')}
        {renderList('A Tiempo', aTiempo, 'text-green-700', 'bg-green-500')}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!cursoId && (
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Calendario de Trabajo</h1>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Sidebar */}
        <div className="w-full lg:w-80 flex-shrink-0">
          {renderSidebar()}
        </div>

        {/* Calendar */}
        <div className="flex-1 w-full bg-white shadow-sm rounded-xl border border-slate-200 p-6">
          {renderHeader()}
          <div className="rounded-xl overflow-hidden border border-slate-200">
            {renderDays()}
            {renderCells()}
          </div>
        </div>
      </div>
    </div>
  );
}
