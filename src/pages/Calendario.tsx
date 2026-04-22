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
    tipo_tarea: 'Diseño' as 'Diseño' | 'Multimedia' | 'Transmisión' | 'Soporte',
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
        const hasTasks = dayEvents.length > 0;

        days.push(
          <div
            key={day.toString()}
            className={`min-h-[80px] p-2 border-b border-r border-muted/30 transition-colors ${
              !isCurrentMonth ? 'bg-background/30 text-slate-300' : 
              hasTasks ? 'bg-primary/5 text-text-main' : 'bg-white text-text-main'
            } ${isToday ? 'bg-primary/10 ring-1 ring-inset ring-primary/20' : ''}`}
          >
            <div className="flex flex-col items-center justify-center h-full">
              <span className={`text-sm font-bold w-8 h-8 flex items-center justify-center rounded-full transition-all ${
                isToday ? 'bg-primary text-white shadow-sm scale-110' : 
                hasTasks ? 'text-primary' : ''
              }`}>
                {formattedDate}
              </span>
              {hasTasks && (
                <div className="mt-1.5 flex gap-0.5 justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                  {dayEvents.length > 1 && <div className="w-1.5 h-1.5 rounded-full bg-primary/60"></div>}
                </div>
              )}
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

  const renderTaskList = (title: string, events: any[], colorClass: string, bgClass: string) => {
    const sortByDate = (a: any, b: any) => {
      const dateA = new Date(a.fecha_entrega).getTime();
      const dateB = new Date(b.fecha_entrega).getTime();
      return dateA - dateB;
    };

    const sortedEvents = [...events].sort(sortByDate);

    return (
      <div className="flex flex-col h-full bg-white shadow-sm rounded-xl border border-muted/30 overflow-hidden">
        <div className="px-5 py-4 border-b border-muted/30 bg-background/50 sticky top-0 z-10">
          <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center ${colorClass}`}>
            <div className={`w-2.5 h-2.5 rounded-full mr-2.5 ${bgClass} shadow-sm`}></div>
            {title}
            <span className="ml-auto bg-white/80 px-2 py-0.5 rounded-full border border-current/10 text-[10px]">
              {events.length}
            </span>
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[calc(100vh-16rem)]">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 opacity-30">
              <CheckCircle className="w-8 h-8 mb-2" />
              <p className="text-xs font-bold italic">Sin tareas pendientes</p>
            </div>
          ) : (
            sortedEvents.map((event, idx) => (
              <TareaTimerItem 
                key={event.id || idx} 
                tarea={event} 
                onUpdate={fetchEntregas} 
                hideType={true}
                hideRole={true}
              />
            ))
          )}
        </div>
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

  const vencidas = entregas.filter(e => {
    if (e.estado === 'Completado' || e.estado === 'Completada') return false;
    const today = startOfDay(new Date());
    const dueDate = startOfDay(parseISO(e.fecha_entrega));
    return differenceInDays(dueDate, today) < 0;
  });

  const enProgreso = entregas.filter(e => {
    if (e.estado === 'Completado' || e.estado === 'Completada') return false;
    const today = startOfDay(new Date());
    const dueDate = startOfDay(parseISO(e.fecha_entrega));
    return differenceInDays(dueDate, today) >= 0;
  });

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
                      <option value="Soporte">Soporte</option>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Column 1: Calendar */}
        <div className="w-full bg-white shadow-sm rounded-xl border border-muted/30 p-6">
          {renderHeader()}
          <div className="rounded-xl overflow-hidden border border-muted/30">
            {renderDays()}
            {renderCells()}
          </div>
        </div>

        {/* Column 2: Vencidas */}
        <div className="w-full">
          {renderTaskList('Tareas Vencidas', vencidas, 'text-red-700', 'bg-red-500')}
        </div>

        {/* Column 3: En Progreso */}
        <div className="w-full">
          {renderTaskList('Tareas En Progreso', enProgreso, 'text-yellow-700', 'bg-yellow-500')}
        </div>
      </div>
    </div>
  );
}
