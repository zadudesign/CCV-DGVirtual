import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, CheckCircle, Clock } from 'lucide-react';
import { User, NotificacionTarea } from '../types';
import { supabase } from '../lib/supabase';
import { isSameDay, differenceInDays, startOfDay, parseISO } from 'date-fns';

interface WelcomeModalProps {
  user: User;
  onClose: () => void;
}

export default function WelcomeModal({ user, onClose }: WelcomeModalProps) {
  const [tasks, setTasks] = useState<NotificacionTarea[]>([]);
  const [novedades, setNovedades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch Tasks
      let taskQuery = supabase
        .from('notificaciones_tareas')
        .select('*, curso:cursos(nombre)')
        .order('fecha_vencimiento', { ascending: true });

      if (user.role !== 'admin') {
        if (['Soporte', 'Multimedia', 'Diseño', 'Pedagogía', 'team'].includes(user.role || '')) {
          const area = user.team_area || user.role;
          taskQuery = taskQuery.or(`usuario_id.eq.${user.id},rol_destino.eq.${area}`);
        } else {
          taskQuery = taskQuery.or(`usuario_id.eq.${user.id},rol_destino.eq.${user.role}`);
        }
      }
      const { data: tasksData } = await taskQuery;
      
      const pendingTasks = (tasksData || []).filter(t => t.estado !== 'Completada' && t.estado !== 'Completado');
      setTasks(pendingTasks);

      // Fetch Cursos Activos and Novedades
      const isAdmin = user.role === 'admin' || user.role === 'team' || 
                      ['Soporte', 'Multimedia', 'Diseño', 'Pedagogía'].includes(user.role);

      let cursosQuery = supabase.from('cursos').select('id').neq('estado', 'Publicado');

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

      const { data: cursosData } = await cursosQuery;
      const activeIds = (cursosData || []).map(c => c.id);

      if (activeIds.length > 0) {
        const { data: novedadesData } = await supabase
          .from('novedades_curso')
          .select('*, curso:cursos(nombre)')
          .in('curso_id', activeIds)
          .order('created_at', { ascending: false })
          .limit(5);
        setNovedades(novedadesData || []);
      } else {
        setNovedades([]);
      }

    } catch (error) {
      console.error('Error in WelcomeModal:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTaskStatus = (fecha: string) => {
    const today = startOfDay(new Date());
    const dueDate = startOfDay(parseISO(fecha));
    const diffDays = differenceInDays(dueDate, today);

    if (diffDays < 0) {
      return { label: 'Vencida', color: 'text-red-600 bg-red-50 border-red-200' };
    } else if (diffDays === 0) {
      return { label: 'Hoy', color: 'text-amber-600 bg-amber-50 border-amber-200' };
    } else {
      return { label: `En ${diffDays} días`, color: 'text-blue-600 bg-blue-50 border-blue-200' };
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">¡Hola, {user.name}!</h2>
            <p className="text-sm text-slate-500 mt-1">Este es el resumen de tu actividad reciente</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
              <p className="text-slate-500 font-medium">Cargando tu resumen...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Tareas */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                    Tus Tareas Pendientes
                  </h3>
                  <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs font-bold">
                    {tasks.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {tasks.length === 0 ? (
                    <div className="text-center p-8 bg-slate-50 border border-slate-100 rounded-xl">
                      <CheckCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">No tienes tareas pendientes</p>
                    </div>
                  ) : (
                    tasks.slice(0, 5).map((task) => {
                      const status = getTaskStatus(task.fecha_vencimiento);
                      return (
                        <div 
                          key={task.id}
                          className="p-4 bg-white border border-slate-200 rounded-xl hover:border-primary/30 transition-colors shadow-sm"
                        >
                          <div className="flex justify-between items-start gap-4 mb-2">
                            <h4 className="font-bold text-slate-800 leading-tight">
                              {task.titulo}
                            </h4>
                            <span className={`shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase border rounded whitespace-nowrap ${status.color}`}>
                              {status.label}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mb-3 line-clamp-2">
                            {task.descripcion}
                          </p>
                          <div className="flex items-center justify-between mt-auto">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/5 px-2 py-1 rounded">
                              {task.curso?.nombre || task.proyecto || 'General'}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  )}
                  
                  {tasks.length > 5 && (
                    <button 
                      onClick={() => { onClose(); navigate('/calendario'); }}
                      className="w-full py-2 text-xs font-bold text-primary hover:bg-primary/5 rounded-lg transition-colors border border-transparent hover:border-primary/20"
                    >
                      Ver {tasks.length - 5} tareas más
                    </button>
                  )}
                </div>
              </div>

              {/* Novedades */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                    Novedades Recientes
                  </h3>
                  <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-xs font-bold">
                    {novedades.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {novedades.length === 0 ? (
                    <div className="text-center p-8 bg-slate-50 border border-slate-100 rounded-xl">
                      <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">No hay novedades recientes</p>
                    </div>
                  ) : (
                    novedades.map((novedad) => (
                      <div 
                        key={novedad.id}
                        className="p-4 bg-white border border-slate-200 rounded-xl hover:border-primary/30 transition-colors shadow-sm cursor-pointer"
                        onClick={() => { onClose(); navigate(`/cursos/${novedad.curso_id}`); }}
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-primary mb-1">
                            {novedad.curso?.nombre}
                          </span>
                          <h4 className="font-bold text-slate-800 text-sm mb-1">
                            {novedad.titulo}
                          </h4>
                          <p className="text-xs text-slate-500 line-clamp-2 mb-2">
                            {novedad.comentario}
                          </p>
                          <span className="text-[10px] text-slate-400 mt-1 uppercase font-medium">
                            {new Date(novedad.created_at).toLocaleDateString('es-ES', { 
                              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
                            })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
          >
            Continuar al Dashboard
          </button>
        </div>

      </div>
    </div>
  );
}
