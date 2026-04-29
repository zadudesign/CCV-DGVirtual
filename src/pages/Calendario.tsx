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

import { HOURLY_RATES } from '../lib/constants';

const COLOMBIA_TZ = 'America/Bogota';
import { TareaTimerItem } from '../components/TareaTimerItem';

export default function Calendario({ cursoId }: { cursoId?: string }) {
  const { user } = useAuth();
  const [entregas, setEntregas] = useState<EntregaCalendario[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [proyectos, setProyectos] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [hourlyRates, setHourlyRates] = useState<Record<string, number>>(HOURLY_RATES);
  
  // Filtros
  const [filtroEncargado, setFiltroEncargado] = useState<string>('');
  const [filtroOrigen, setFiltroOrigen] = useState<string>(''); // Para Curso/Proyecto

  const [formData, setFormData] = useState({
    proyecto: 'Diseño Virtual',
    titulo: '',
    tipo_tarifa: 'Diseño',
    descripcion: '',
    fecha_inicial: '',
    fecha_vencimiento: '',
    rol_destino: 'Diseño'
  });

  useEffect(() => {
    if (user) {
      fetchEntregas();
      fetchProyectos();
      fetchRates();
    }
  }, [user, cursoId]);

  const fetchRates = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracion_tarifas')
        .select('*');
      
      if (!error && data && data.length > 0) {
        const ratesMap: Record<string, number> = { ...HOURLY_RATES };
        data.forEach((r: any) => {
          ratesMap[r.nombre_tipo] = r.tarifa_hora;
        });
        setHourlyRates(ratesMap);
      }
    } catch (e) {
      console.error('Error fetching rates:', e);
    }
  };

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
            fecha_inicial: row.fecha_inicial,
            fecha_entrega: row.fecha_vencimiento,
            fecha_completada: row.fecha_completada,
            fecha_inicio: row.fecha_inicio, // If it exists in the future
            estado: row.estado,
            detalle: row.descripcion || '',
            tipo_tarifa: row.tipo_tarifa,
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
      const fechaInicialColombia = formData.fecha_inicial ? `${formData.fecha_inicial}T00:00:00-05:00` : null;

      const payload: any = {
        titulo: formData.titulo,
        tipo_tarifa: formData.tipo_tarifa,
        descripcion: formData.descripcion,
        fecha_inicial: fechaInicialColombia,
        fecha_vencimiento: fechaVencimientoColombia,
        rol_destino: formData.rol_destino,
        estado: 'Pendiente',
        usuario_id: user?.id,
        proyecto: formData.proyecto
      };

      if (cursoId) {
        payload.curso_id = cursoId;
      }

      const { error } = await supabase.from('notificaciones_tareas').insert([payload]);
      if (error) throw error;

      setIsModalOpen(false);
      setFormData({
        proyecto: 'Diseño Virtual',
        titulo: '',
        tipo_tarifa: 'Diseño',
        descripcion: '',
        fecha_inicial: '',
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
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(null);
  };

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col">
          <h2 className="text-lg font-bold text-text-main capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </h2>
          {selectedDate && (
            <button 
              onClick={() => setSelectedDate(null)}
              className="mt-1 text-[10px] font-bold text-primary flex items-center hover:underline"
            >
              <X className="w-3 h-3 mr-1" />
              Ver Todas las Tareas
            </button>
          )}
        </div>
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
    const dayLabels = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
    return (
      <div className="grid grid-cols-7 mb-2">
        {dayLabels.map((label, i) => (
          <div key={i} className="py-2 text-center text-xs font-bold text-secondary uppercase tracking-widest">
            {label}
          </div>
        ))}
      </div>
    );
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
        const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
        const hasTasks = dayEvents.length > 0;

        days.push(
          <div
            key={day.toString()}
            className="aspect-square flex items-center justify-center p-1"
            onClick={() => setSelectedDate(cloneDay)}
          >
            <div className={`relative w-full h-full flex flex-col items-center justify-center rounded-2xl cursor-pointer transition-all duration-300 ${
              isSelected ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-110 z-20' :
              isToday ? 'bg-amber-100 ring-2 ring-amber-400 text-amber-700 z-10' : 
              hasTasks && isCurrentMonth ? 'bg-primary/5 text-primary font-bold' : 
              !isCurrentMonth ? 'text-slate-200' : 'text-slate-600 hover:bg-slate-50'
            }`}>
              <span className={`text-sm ${isSelected || isToday ? 'font-bold' : 'font-medium'}`}>
                {formattedDate}
              </span>
              {hasTasks && !isSelected && isCurrentMonth && (
                <div className={`absolute bottom-2 flex gap-0.5 justify-center`}>
                  <div className={`w-1 h-1 rounded-full ${isToday ? 'bg-amber-500' : 'bg-primary/60'}`}></div>
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
    return <div className="space-y-1">{rows}</div>;
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
                customRates={hourlyRates}
                hideType={true}
                hideRole={false}
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
    
    // Aplicar Filtros
    if (filtroEncargado && e.rol_destino !== filtroEncargado) return false;
    
    const origenTarea = e.proyecto || (e.curso && e.curso.nombre) || 'Diseño Virtual';
    if (filtroOrigen && origenTarea !== filtroOrigen) return false;

    const today = startOfDay(new Date());
    const dueDate = startOfDay(parseISO(e.fecha_entrega));
    
    // Filter by selected date if exists
    if (selectedDate && !isSameDay(dueDate, selectedDate)) return false;
    
    return differenceInDays(dueDate, today) < 0;
  });

  const enProgreso = entregas.filter(e => {
    if (e.estado === 'Completado' || e.estado === 'Completada') return false;

    // Aplicar Filtros
    if (filtroEncargado && e.rol_destino !== filtroEncargado) return false;
    
    const origenTarea = e.proyecto || (e.curso && e.curso.nombre) || 'Diseño Virtual';
    if (filtroOrigen && origenTarea !== filtroOrigen) return false;

    const today = startOfDay(new Date());
    const dueDate = startOfDay(parseISO(e.fecha_entrega));
    
    // Filter by selected date if exists
    if (selectedDate && !isSameDay(dueDate, selectedDate)) return false;
    
    return differenceInDays(dueDate, today) >= 0;
  });

  const rolesDisponibles = Array.from(new Set(entregas.map(e => e.rol_destino).filter(Boolean))).sort();
  const origenesDisponibles = Array.from(new Set(entregas.map(e => e.proyecto || (e.curso && e.curso.nombre) || 'Diseño Virtual').filter(Boolean))).sort();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-end gap-4">
        {!cursoId && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary whitespace-nowrap self-start"
          >
            <Plus className="h-5 w-5 mr-2" />
            Agregar Tarea
          </button>
        )}
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-xl border border-muted/20 shadow-sm flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest mb-1.5 ml-1">Filtrar por Encargado:</label>
          <select 
            value={filtroEncargado}
            onChange={(e) => setFiltroEncargado(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
          >
            <option value="">Todos los Roles / Teams</option>
            {rolesDisponibles.map(rol => (
              <option key={rol} value={rol}>{rol}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest mb-1.5 ml-1">Filtrar por Curso / Proyecto:</label>
          <select 
            value={filtroOrigen}
            onChange={(e) => setFiltroOrigen(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
          >
            <option value="">Todos los Orígenes</option>
            {origenesDisponibles.map(origen => (
              <option key={origen} value={origen}>{origen}</option>
            ))}
          </select>
        </div>

        {(filtroEncargado || filtroOrigen) && (
          <button 
            onClick={() => { setFiltroEncargado(''); setFiltroOrigen(''); }}
            className="self-end px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5 border border-transparent hover:border-red-100 mb-0.5"
          >
            <X className="w-3.5 h-3.5" />
            Limpiar Filtros
          </button>
        )}
      </div>

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
                  {!cursoId && (
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
                  )}
                  <div>
                    <label className="block text-sm font-bold text-text-main mb-3">Tarifa de la Tarea (Selecciona una)</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.entries(hourlyRates).map(([tipo, tarifa]) => (
                        <div 
                          key={tipo}
                          onClick={() => setFormData({...formData, tipo_tarifa: tipo})}
                          className={`flex items-center p-3 rounded-xl border-2 transition-all cursor-pointer shadow-sm hover:shadow-md ${
                            formData.tipo_tarifa === tipo 
                              ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                              : 'border-slate-100 bg-slate-50 hover:bg-white'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center mr-3 transition-colors ${
                            formData.tipo_tarifa === tipo 
                              ? 'bg-primary border-primary text-white shadow-sm' 
                              : 'bg-white border-slate-300'
                          }`}>
                            {formData.tipo_tarifa === tipo && (
                              <CheckCircle className="w-3.5 h-3.5 stroke-[3]" />
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className={`text-xs font-bold uppercase tracking-tight ${formData.tipo_tarifa === tipo ? 'text-primary' : 'text-slate-600'}`}>
                              {tipo}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-emerald-600">
                              ${new Intl.NumberFormat('es-CO').format(tarifa as number)}/h
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
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
                    <label className="block text-sm font-medium text-text-main mb-1">Fecha Inicial (Propuesta)</label>
                    <input
                      type="date"
                      value={formData.fecha_inicial}
                      onChange={(e) => setFormData({...formData, fecha_inicial: e.target.value})}
                      className="w-full rounded-md border border-muted px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-main mb-1">Fecha de Entrega (Vencimiento)</label>
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
        <div className="w-full bg-white shadow-xl shadow-slate-200/50 rounded-3xl border border-slate-100 p-8">
          {renderHeader()}
          <div className="mt-6">
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
