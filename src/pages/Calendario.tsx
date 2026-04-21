import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Clock, CheckCircle, AlertCircle, Loader2, ChevronLeft, ChevronRight, Bell, Plus, X } from 'lucide-react';
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
  startOfDay,
  endOfDay
} from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { es } from 'date-fns/locale';

const COLOMBIA_TZ = 'America/Bogota';
import { TareaTimerItem } from '../components/TareaTimerItem';

export default function Calendario({ cursoId }: { cursoId?: string }) {
  const { user } = useAuth();
  const [entregas, setEntregas] = useState<EntregaCalendario[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [proyectos, setProyectos] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    proyecto: 'Diseño Virtual',
    titulo: '',
    tipo_tarea: 'Diseño' as 'Diseño' | 'Multimedia' | 'Transmisión',
    descripcion: '',
    fecha_vencimiento: '',
    rol_destino: 'Diseño'
  });

  useEffect(() => {
    if (user) {
      fetchEntregas();
      fetchProyectos();
    }
  }, [user, cursoId]);

  const fetchProyectos = async () => {
    try {
      const { data, error } = await supabase
        .from('proyectos_ec')
        .select('nombre')
        .order('nombre');
      if (!error && data) {
        setProyectos(data);
      }
    } catch (e) {
      console.error('Error fetching proyectos:', e);
    }
  };

  const fetchEntregas = async () => {
    try {
      setLoading(true);
      
      let notificacionesQuery = supabase
        .from('notificaciones_tareas')
        .select('*, curso:cursos(nombre, facultad, programa)');

      if (cursoId) {
        notificacionesQuery = notificacionesQuery.eq('curso_id', cursoId);
      }

      const { data: notificacionesData, error: notificacionesError } = await notificacionesQuery;
      
      if (notificacionesError && notificacionesError.code !== '42P01') {
        throw notificacionesError;
      }
      
      let filteredData = notificacionesData || [];

      // Manual filtering for non-admins to handle complex role-based access
      if (!cursoId && user?.role !== 'admin') {
        const area = user?.team_area || user?.role;
        filteredData = filteredData.filter(row => {
          // 1. Assigned directly to user or their role/area
          if (row.usuario_id === user?.id || row.rol_destino === area) return true;
          
          // 2. Course-related tasks for Decanos/Coordinadores
          if (row.curso) {
            if (user?.role === 'decano' && row.curso.facultad === user.facultad) return true;
            if (user?.role === 'coordinador' && row.curso.programa === user.programa) return true;
          }
          
          return false;
        });
      }
      
      const events: any[] = [];
      
      filteredData.forEach((row: any) => {
        // Ocultar tareas completadas según requerimiento
        if (row.estado === 'Completada' || row.estado === 'Completado') {
          return;
        }

        if (row.fecha_vencimiento) {
          events.push({
            id: row.id,
            curso_id: row.curso_id,
            titulo: row.titulo,
            fecha_entrega: row.fecha_vencimiento,
            fecha_completada: row.fecha_completada,
            fecha_inicio: row.fecha_inicio, // If it exists in the future
            estado: row.estado === 'Completada' ? 'Completado' : 'Pendiente',
            detalle: row.descripcion || '',
            tipo_tarea: row.tipo_tarea,
            descripcion: row.descripcion || '',
            curso: row.curso,
            proyecto: row.proyecto,
            tiempo_invertido: row.tiempo_invertido || 0,
            rol_destino: row.rol_destino || '',
            isNotificacion: true
          });
        }
      });

      setEntregas(events);
    } catch (error) {
      console.error('Error fetching entregas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (event: EntregaCalendario, newStatus: string) => {
    // Optimistic update
    setEntregas(prev => prev.map(e => {
      if (e.id === event.id) {
        return { 
          ...e, 
          estado: newStatus as any,
          fecha_completada: newStatus === 'Completado' ? formatInTimeZone(new Date(), COLOMBIA_TZ, "yyyy-MM-dd'T'HH:mm:ssXXX") : null
        };
      }
      return e;
    }));

    try {
      if (event.isNotificacion) {
        const payload: any = { estado: newStatus === 'Completado' ? 'Completada' : 'Pendiente' };
        if (newStatus === 'Completado') {
          payload.fecha_completada = formatInTimeZone(new Date(), COLOMBIA_TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");
        } else {
          payload.fecha_completada = null;
        }

        const { error } = await supabase
          .from('notificaciones_tareas')
          .update(payload)
          .eq('id', event.id);
          
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error updating status:', error);
      fetchEntregas();
    }
  };

  const handleAddTarea = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Ensure date is stored with Colombia timezone offset
      // If user picks 2023-10-27, we store it as 2023-10-27T00:00:00-05:00
      const fechaVencimientoColombia = `${formData.fecha_vencimiento}T00:00:00-05:00`;

      const payload = {
        titulo: formData.titulo,
        tipo_tarea: formData.tipo_tarea,
        descripcion: formData.descripcion,
        fecha_vencimiento: fechaVencimientoColombia,
        rol_destino: formData.rol_destino,
        estado: 'Pendiente',
        usuario_id: user?.id,
        proyecto: formData.proyecto
      };

      const { error } = await supabase.from('notificaciones_tareas').insert([payload]);
      if (error) throw error;

      setIsModalOpen(false);
      setFormData({
        proyecto: 'Diseño Virtual',
        titulo: '',
        tipo_tarea: 'Diseño',
        descripcion: '',
        fecha_vencimiento: '',
        rol_destino: 'Diseño'
      });
      fetchEntregas();
    } catch (error: any) {
      console.error('Error adding tarea:', error);
      alert(`Error al agregar tarea: ${error.message || JSON.stringify(error)}`);
    } finally {
      setSubmitting(false);
    }
  };

  const getTrafficLightStatus = (fecha: string, estado: string) => {
    if (estado === 'Completado' || estado === 'Completada') {
      return {
        color: 'bg-green-100 text-green-800 border-green-200',
        iconBg: 'bg-green-500',
        label: 'Completada'
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
        label: `Vencida (${daysLate} día${daysLate === 1 ? '' : 's'} de retraso)`
      };
    } else {
      return {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        iconBg: 'bg-yellow-500',
        label: 'En Progreso'
      };
    }
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text-main capitalize">
          {format(currentDate, 'MMMM yyyy', { locale: es })}
        </h2>
        <div className="flex items-center space-x-2">
          <button 
            onClick={goToToday}
            className="px-3 py-1.5 text-sm font-medium text-text-main bg-white border border-muted rounded-md hover:bg-background"
          >
            Hoy
          </button>
          <div className="flex items-center bg-white border border-muted rounded-md">
            <button 
              onClick={prevMonth}
              className="p-1.5 text-secondary hover:text-text-main hover:bg-background rounded-l-md"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="w-px h-5 bg-slate-300"></div>
            <button 
              onClick={nextMonth}
              className="p-1.5 text-secondary hover:text-text-main hover:bg-background rounded-r-md"
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
        <div key={i} className="py-2 text-center text-sm font-semibold text-text-main bg-background border-b border-muted/30 capitalize">
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
        
        // Find events that span across this day
        const dayEvents = entregas.filter(entrega => {
          const isCompleted = entrega.estado === 'Completado' || entrega.estado === 'Completada';
          let eventStart, eventEnd;
          
          if (isCompleted && entrega.fecha_completada) {
            eventEnd = parseISO(entrega.fecha_completada);
            eventStart = eventEnd;
          } else {
            eventEnd = parseISO(entrega.fecha_entrega);
            eventStart = entrega.fecha_inicio ? parseISO(entrega.fecha_inicio) : eventEnd;
          }
          
          // Check if the current day falls within the start and end dates (inclusive)
          return cloneDay >= startOfDay(eventStart) && cloneDay <= endOfDay(eventEnd);
        });

        const isCurrentMonth = isSameMonth(day, monthStart);
        const isToday = isSameDay(day, new Date());

        days.push(
          <div
            key={day.toString()}
            className={`min-h-[120px] p-2 border-b border-r border-muted/30 ${
              !isCurrentMonth ? 'bg-background/50 text-slate-400' : 'bg-white text-text-main'
            } ${isToday ? 'bg-primary/5' : ''}`}
          >
            <div className="flex justify-end">
              <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${
                isToday ? 'bg-primary text-white' : ''
              }`}>
                {formattedDate}
              </span>
            </div>
            <div className="mt-2 space-y-1.5 relative">
              {dayEvents.map((event, idx) => {
                const isCompleted = event.estado === 'Completado' || event.estado === 'Completada';
                const status = getTrafficLightStatus(event.fecha_entrega, event.estado);
                
                let eventStart, eventEnd;
                if (isCompleted && event.fecha_completada) {
                  eventEnd = parseISO(event.fecha_completada);
                  eventStart = eventEnd;
                } else {
                  eventEnd = parseISO(event.fecha_entrega);
                  eventStart = event.fecha_inicio ? parseISO(event.fecha_inicio) : eventEnd;
                }
                
                const isStart = isSameDay(cloneDay, eventStart);
                const isEnd = isSameDay(cloneDay, eventEnd);
                
                // Determine styling based on position in the span
                let roundedClass = '';
                if (isStart && isEnd) roundedClass = 'rounded-md';
                else if (isStart) roundedClass = 'rounded-l-md border-r-0';
                else if (isEnd) roundedClass = 'rounded-r-md border-l-0';
                else roundedClass = 'rounded-none border-x-0';

                return (
                  <div 
                    key={event.id || idx} 
                    className={`px-2 py-1.5 text-xs border ${status.color} ${roundedClass} ${!isStart ? 'pl-1' : ''}`}
                    title={`${event.curso?.nombre} - ${event.titulo}\n${status.label}`}
                  >
                    {isStart ? (
                      <>
                        <div className="font-semibold truncate">{event.titulo}</div>
                        {event.curso_id ? (
                          <Link to={`/cursos/${event.curso_id}`} className="truncate opacity-80 hover:underline hover:text-primary block">
                            {event.curso?.nombre}
                          </Link>
                        ) : (
                          <div className="truncate opacity-80">{event.proyecto || 'Diseño Virtual'}</div>
                        )}
                        {isStart && isEnd && event.detalle && (
                          <div className="mt-1 bg-white/60 rounded px-1.5 py-1 text-[9px] text-text-main border border-black/5 flex items-start gap-1">
                            <div className={`flex-shrink-0 w-3 h-3 rounded-full flex items-center justify-center ${status.iconBg}`}>
                              <Bell className="w-2 h-2 text-white" />
                            </div>
                            <span className="truncate leading-tight">{event.detalle}</span>
                          </div>
                        )}
                        <div className="text-[10px] mt-1 font-medium italic opacity-90 truncate">{status.label}</div>
                      </>
                    ) : (
                      <div className="h-4"></div> // Empty space for continuous bar
                    )}
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
    return <div className="border-l border-t border-muted/30 rounded-b-xl overflow-hidden">{rows}</div>;
  };

  const renderSidebar = () => {
    const vencidas: any[] = [];
    const enProgreso: any[] = [];
    const completadas: any[] = [];

    const today = startOfDay(new Date());

    entregas.forEach(event => {
      if (event.estado === 'Completado' || event.estado === 'Completada') {
        completadas.push(event);
        return;
      }

      const dueDate = startOfDay(parseISO(event.fecha_entrega));
      const diffDays = differenceInDays(dueDate, today);

      if (diffDays < 0) {
        vencidas.push(event);
      } else {
        enProgreso.push(event);
      }
    });

    const sortByDate = (a: any, b: any) => {
      const dateA = (a.estado === 'Completado' || a.estado === 'Completada') && a.fecha_completada 
        ? new Date(a.fecha_completada).getTime() 
        : new Date(a.fecha_entrega).getTime();
      const dateB = (b.estado === 'Completado' || b.estado === 'Completada') && b.fecha_completada 
        ? new Date(b.fecha_completada).getTime() 
        : new Date(b.fecha_entrega).getTime();
      return dateA - dateB;
    };

    vencidas.sort(sortByDate);
    enProgreso.sort(sortByDate);
    completadas.sort(sortByDate);

    const renderList = (title: string, events: any[], colorClass: string, bgClass: string) => (
      <div className="mb-6 last:mb-0">
        <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 flex items-center ${colorClass}`}>
          <div className={`w-2 h-2 rounded-full mr-2 ${bgClass}`}></div>
          {title} ({events.length})
        </h3>
        <div className="space-y-3">
          {events.length === 0 ? (
            <p className="text-sm text-secondary italic">No hay tareas en esta sección</p>
          ) : (
            events.map((event, idx) => {
              if (event.isNotificacion && event.proyecto) {
                return (
                  <TareaTimerItem 
                    key={event.id || idx} 
                    tarea={event} 
                    onUpdate={fetchEntregas} 
                  />
                );
              }

              const status = getTrafficLightStatus(event.fecha_entrega, event.estado);
              return (
                <div key={event.id || idx} className={`p-3 rounded-lg border ${status.color}`}>
                  <div className="font-semibold text-sm">{event.titulo}</div>
                  {event.curso_id ? (
                    <Link to={`/cursos/${event.curso_id}`} className="text-xs opacity-80 mt-0.5 hover:underline hover:text-primary block">
                      {event.curso?.nombre}
                    </Link>
                  ) : (
                    <div className="text-xs opacity-80 mt-0.5">{event.proyecto || 'Diseño Virtual'}</div>
                  )}
                  {event.detalle && (
                    <div className="mt-1.5 bg-white/60 rounded px-2 py-1.5 text-[10px] text-text-main border border-black/5 flex items-start gap-1.5">
                      <div className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${status.iconBg}`}>
                        <Bell className="w-2.5 h-2.5 text-white" />
                      </div>
                      <span className="leading-tight">{event.detalle}</span>
                    </div>
                  )}
                  <div className="text-xs font-medium mt-2 flex items-center justify-between">
                    <span>
                      {(event.estado === 'Completado' || event.estado === 'Completada') && event.fecha_completada
                        ? `Completada: ${format(parseISO(event.fecha_completada), 'dd MMM yyyy', { locale: es })}`
                        : format(parseISO(event.fecha_entrega), 'dd MMM yyyy', { locale: es })
                      }
                    </span>
                    <span className="italic opacity-90 text-[10px] text-right ml-2">{status.label}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );

    return (
      <div className="bg-white shadow-sm rounded-xl border border-muted/30 p-5 max-h-[calc(100vh-12rem)] overflow-y-auto sticky top-6">
        {renderList('Tareas Vencidas', vencidas, 'text-red-700', 'bg-red-500')}
        {renderList('Tareas En Progreso', enProgreso, 'text-yellow-700', 'bg-yellow-500')}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!cursoId && (
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text-main">Calendario de Trabajo</h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <Plus className="h-5 w-5 mr-2" />
            Agregar Tarea
          </button>
        </div>
      )}

      {/* Modal Agregar Tarea */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/75 transition-opacity" onClick={() => setIsModalOpen(false)}></div>
          
          <div className="relative bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all w-full max-w-lg z-10">
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg leading-6 font-medium text-text-main">
                  Agregar Nueva Tarea
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-500">
                  <X className="h-6 w-6" />
                </button>
              </div>
                <form onSubmit={handleAddTarea} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-main mb-1">Proyecto</label>
                    <select
                      required
                      value={formData.proyecto}
                      onChange={(e) => setFormData({...formData, proyecto: e.target.value})}
                      className="w-full rounded-md border border-muted px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="Diseño Virtual">Diseño Virtual</option>
                      {proyectos.map((p, idx) => (
                        <option key={idx} value={p.nombre}>{p.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-main mb-1">Tipo de Tarea</label>
                    <select
                      required
                      value={formData.tipo_tarea}
                      onChange={(e) => setFormData({...formData, tipo_tarea: e.target.value as any})}
                      className="w-full rounded-md border border-muted px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="Diseño">Diseño</option>
                      <option value="Multimedia">Multimedia</option>
                      <option value="Transmisión">Transmisión</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-main mb-1">Tarea</label>
                    <input
                      type="text"
                      required
                      value={formData.titulo}
                      onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                      className="w-full rounded-md border border-muted px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Nombre de la tarea"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-main mb-1">Detalle</label>
                    <textarea
                      rows={3}
                      value={formData.descripcion}
                      onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                      className="w-full rounded-md border border-muted px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Descripción detallada..."
                    ></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-main mb-1">Fecha de Entrega</label>
                    <input
                      type="date"
                      required
                      value={formData.fecha_vencimiento}
                      onChange={(e) => setFormData({...formData, fecha_vencimiento: e.target.value})}
                      className="w-full rounded-md border border-muted px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-main mb-1">Team (Rol Destino)</label>
                    <select
                      required
                      value={formData.rol_destino}
                      onChange={(e) => setFormData({...formData, rol_destino: e.target.value})}
                      className="w-full rounded-md border border-muted px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="Diseño">Diseño</option>
                      <option value="Soporte">Soporte</option>
                      <option value="Pedagogía">Pedagogía</option>
                      <option value="Multimedia">Multimedia</option>
                    </select>
                  </div>
                  <div className="pt-4 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 text-sm font-medium text-text-main bg-white border border-muted rounded-md hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-hover disabled:opacity-50"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Guardar Tarea
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Sidebar */}
        <div className="w-full lg:w-80 flex-shrink-0">
          {renderSidebar()}
        </div>

        {/* Calendar */}
        <div className="flex-1 w-full bg-white shadow-sm rounded-xl border border-muted/30 p-6">
          {renderHeader()}
          <div className="rounded-xl overflow-hidden border border-muted/30">
            {renderDays()}
            {renderCells()}
          </div>
        </div>
      </div>
    </div>
  );
}
