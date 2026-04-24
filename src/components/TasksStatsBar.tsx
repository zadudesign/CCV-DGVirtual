import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { User, NotificacionTarea } from '../types';

interface TasksStatsBarProps {
  user: User;
}

export default function TasksStatsBar({ user }: TasksStatsBarProps) {
  const [allTasks, setAllTasks] = useState<NotificacionTarea[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();

    const taskSubscription = supabase
      .channel('tasks_stats_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'notificaciones_tareas'
      }, () => {
        fetchTasks();
      })
      .subscribe();

    return () => {
      taskSubscription.unsubscribe();
    };
  }, [user.id]);

  const fetchTasks = async () => {
    try {
      let query = supabase
        .from('notificaciones_tareas')
        .select('*, curso:cursos(nombre)')
        .order('fecha_vencimiento', { ascending: true });

      if (user.role !== 'admin') {
        if (['Soporte', 'Multimedia', 'Diseño', 'Pedagogía', 'team'].includes(user.role || '')) {
          const area = user.team_area || user.role;
          query = query.or(`usuario_id.eq.${user.id},rol_destino.eq.${area}`);
        } else {
          query = query.or(`usuario_id.eq.${user.id},rol_destino.eq.${user.role}`);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setAllTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks for stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const pendingTasks = allTasks.filter(t => t.estado !== 'Completada' && t.estado !== 'Completado');

  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-xl shadow-md border border-muted/20 p-4 flex flex-col sm:flex-row items-center relative z-10 gap-6">
      <span className="text-sm font-black text-rose-600 uppercase tracking-widest border-b sm:border-b-0 sm:border-r border-slate-100 pb-2 sm:pb-0 sm:pr-8 leading-tight flex items-center justify-center text-center whitespace-nowrap min-w-[120px]">
        NUEVAS TAREAS
      </span>
      
      {loading ? (
        <div className="flex items-center space-x-4">
          <Loader2 className="w-5 h-5 animate-spin text-primary/30" />
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
          {/* Notificaciones Bell */}
          <button 
            onClick={() => navigate('/calendario')}
            className="group relative p-2 rounded-full transition-all hover:bg-slate-50 text-slate-400 hover:text-primary hover:scale-110 active:scale-95"
            title="Ver Tareas en Calendario"
          >
            <Bell className="h-7 w-7" />
            {pendingTasks.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[12px] font-bold px-1.5 min-w-[20px] h-[20px] flex items-center justify-center rounded-full leading-none shadow-sm ring-2 ring-white">
                {pendingTasks.length}
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
