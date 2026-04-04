import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { NotificacionTarea } from '../types';
import { Loader2, CheckSquare, Clock, AlertCircle, ExternalLink, CheckCircle2 } from 'lucide-react';
import { format, isPast, isToday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function MisTareas() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<NotificacionTarea[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTasks();
      
      const subscription = supabase
        .channel('mis_tareas_cambios')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'notificaciones_tareas'
        }, () => {
          fetchTasks();
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notificaciones_tareas')
        .select('*, curso:cursos(nombre)')
        .order('estado', { ascending: false }) // Pendiente first, then Completada
        .order('fecha_vencimiento', { ascending: true, nullsFirst: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (estado: string, fechaVencimiento?: string) => {
    if (estado === 'Completada') {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800"><CheckCircle2 className="w-3 h-3 mr-1" /> Completada</span>;
    }

    if (fechaVencimiento) {
      const date = parseISO(fechaVencimiento);
      if (isPast(date) && !isToday(date)) {
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" /> Vencida</span>;
      }
      if (isToday(date)) {
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" /> Vence hoy</span>;
      }
    }

    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">Pendiente</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const pendingTasks = tasks.filter(t => t.estado !== 'Completada');
  const completedTasks = tasks.filter(t => t.estado === 'Completada');

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <CheckSquare className="w-6 h-6 mr-2 text-indigo-600" />
            Mis Tareas
          </h1>
          <p className="text-slate-500 mt-1">
            Gestiona tus tareas asignadas y notificaciones de ClickUp.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-800">Tareas Pendientes ({pendingTasks.length})</h2>
        </div>
        
        {pendingTasks.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">¡Todo al día!</h3>
            <p className="text-slate-500 mt-1">No tienes tareas pendientes en este momento.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {pendingTasks.map((task) => (
              <li key={task.id} className="p-6 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-base font-semibold text-slate-900 truncate">{task.titulo}</h3>
                      {getStatusBadge(task.estado, task.fecha_vencimiento)}
                    </div>
                    
                    {task.curso?.nombre && (
                      <p className="text-sm font-medium text-indigo-600 mb-2">
                        Curso: {task.curso.nombre}
                      </p>
                    )}
                    
                    {task.descripcion && (
                      <p className="text-sm text-slate-600 mb-3 whitespace-pre-wrap">
                        {task.descripcion}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      {task.fecha_vencimiento && (
                        <span className="flex items-center">
                          <Clock className="w-3.5 h-3.5 mr-1" />
                          Vence: {format(parseISO(task.fecha_vencimiento), "d 'de' MMMM, yyyy", { locale: es })}
                        </span>
                      )}
                      {task.url_clickup && (
                        <a 
                          href={task.url_clickup} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center text-indigo-600 hover:text-indigo-800"
                        >
                          <ExternalLink className="w-3.5 h-3.5 mr-1" />
                          Ver en ClickUp
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {completedTasks.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden opacity-75">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-800">Tareas Completadas ({completedTasks.length})</h2>
          </div>
          <ul className="divide-y divide-slate-200">
            {completedTasks.map((task) => (
              <li key={task.id} className="p-6 bg-slate-50/50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-base font-medium text-slate-700 line-through truncate">{task.titulo}</h3>
                      {getStatusBadge(task.estado)}
                    </div>
                    {task.curso?.nombre && (
                      <p className="text-sm text-slate-500 mb-2">
                        Curso: {task.curso.nombre}
                      </p>
                    )}
                  </div>
                  {task.url_clickup && (
                    <div className="flex-shrink-0">
                      <a 
                        href={task.url_clickup} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-xs font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        <ExternalLink className="w-3.5 h-3.5 mr-1" />
                        Ver en ClickUp
                      </a>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
