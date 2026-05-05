import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { User, NotificacionTarea } from '../types';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface TasksStatsBarProps {
  user: User;
}

export default function TasksStatsBar({ user }: TasksStatsBarProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const taskSubscription = supabase
      .channel('tasks_stats_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'notificaciones_tareas'
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['tasks-stats', user.id] });
      })
      .subscribe();

    return () => {
      taskSubscription.unsubscribe();
    };
  }, [queryClient, user.id]);

  const { data: allTasks = [], isLoading: loading } = useQuery({
    queryKey: ['tasks-stats', user.id],
    queryFn: async () => {
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
      return (data || []) as NotificacionTarea[];
    }
  });

  const pendingTasks = allTasks.filter(t => t.estado !== 'Completada' && t.estado !== 'Completado');

  return (
    <div 
      onClick={() => navigate('/calendario')}
      className="bg-white p-6 rounded-xl border border-muted/20 shadow-md flex items-center justify-center cursor-pointer group hover:bg-slate-50 transition-all relative z-10"
    >
      <div className="flex items-center gap-6">
        <span className="text-sm font-black text-rose-600 uppercase tracking-widest border-r border-slate-100 pr-6 leading-tight flex items-center justify-center text-center">
          NUEVAS TAREAS
        </span>
        
        {loading ? (
          <div className="flex items-center space-x-4">
            <Loader2 className="w-5 h-5 animate-spin text-primary/30" />
          </div>
        ) : (
          <div className="relative p-1 rounded-full transition-all text-slate-400 group-hover:text-primary group-hover:scale-110">
            <Bell className="h-7 w-7" />
            {pendingTasks.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[12px] font-bold px-2 min-w-[20px] h-[20px] flex items-center justify-center rounded-full leading-none shadow-sm ring-2 ring-white">
                {pendingTasks.length}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
