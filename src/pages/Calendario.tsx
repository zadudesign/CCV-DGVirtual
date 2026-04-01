import React, { useState, useEffect } from 'react';
import { CalendarDays, Clock, CheckCircle, AlertCircle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
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
  parseISO 
} from 'date-fns';
import { es } from 'date-fns/locale';

export default function Calendario() {
  const { user } = useAuth();
  const [entregas, setEntregas] = useState<EntregaCalendario[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    if (user) {
      fetchEntregas();
    }
  }, [user]);

  const fetchEntregas = async () => {
    try {
      setLoading(true);
      
      let cursosQuery = supabase.from('cursos').select('id');
      
      if (user?.role === 'docente') {
        cursosQuery = cursosQuery.eq('docente_id', user.id);
      } else if (user?.role === 'evaluador') {
        cursosQuery = cursosQuery.eq('evaluador_id', user.id);
      } else if (user?.role === 'creador') {
        cursosQuery = cursosQuery.eq('creador_id', user.id);
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
        const addEvent = (titulo: string, fecha: string | null) => {
          if (fecha) {
            events.push({
              id: `${row.id}-${titulo}`,
              curso_id: row.curso_id,
              titulo,
              fecha_entrega: fecha,
              estado: 'Pendiente', // Default state since we removed it from DB
              curso: row.curso
            });
          }
        };

        addEvent('Solicitud de Creación', row.solicitud_creacion);
        addEvent('Asesorías', row.asesorias);
        addEvent('Sílabo Virtual', row.silabo_virtual);
        addEvent('Unidad 1', row.unidad_1);
        addEvent('Unidad 2', row.unidad_2);
        addEvent('Unidad 3', row.unidad_3);
        addEvent('Unidad 4', row.unidad_4);
        addEvent('Unidad 5', row.unidad_5);
        addEvent('Revisión y Entrega', row.revision_entrega);
      });

      setEntregas(events);
    } catch (error) {
      console.error('Error fetching entregas:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'Completado': return 'bg-green-100 text-green-800 border-green-200';
      case 'En Progreso': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Atrasado': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
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
              {dayEvents.map((event, idx) => (
                <div 
                  key={event.id || idx} 
                  className={`px-2 py-1 text-xs rounded-md border truncate ${getStatusColor(event.estado)}`}
                  title={`${event.curso?.nombre} - ${event.titulo}`}
                >
                  <div className="font-semibold truncate">{event.titulo}</div>
                  <div className="truncate opacity-80">{event.curso?.nombre}</div>
                </div>
              ))}
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Calendario de Trabajo</h1>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-slate-200 p-6">
        {renderHeader()}
        <div className="rounded-xl overflow-hidden border border-slate-200">
          {renderDays()}
          {renderCells()}
        </div>
      </div>
    </div>
  );
}
