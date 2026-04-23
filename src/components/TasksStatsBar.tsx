import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, AlertCircle, Bell, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { User, NotificacionTarea } from '../types';
import { startOfDay, parseISO, differenceInDays } from 'date-fns';
import { motion } from 'framer-motion';

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

  const today = startOfDay(new Date());
  let completadas = 0;
  let enProgreso = 0;
  let vencidas = 0;

  allTasks.forEach(task => {
    if (task.estado === 'Completada' || task.estado === 'Completado') {
      completadas++;
    } else {
      if (task.fecha_vencimiento) {
        const dueDate = startOfDay(parseISO(task.fecha_vencimiento));
        if (differenceInDays(dueDate, today) < 0) {
          vencidas++;
        } else {
          enProgreso++;
        }
      } else {
        enProgreso++;
      }
    }
  });

  const pendingTasks = allTasks.filter(t => t.estado !== 'Completada' && t.estado !== 'Completado');

  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-xl shadow-md border border-muted/20 p-4 flex flex-col sm:flex-row items-center relative z-10 gap-6">
      <span className="text-sm font-bold text-text-main uppercase tracking-widest border-b sm:border-b-0 sm:border-r border-slate-100 pb-2 sm:pb-0 sm:pr-6 whitespace-nowrap">
        Tareas:
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
              <div className="absolute top-2 right-2 flex h-3 w-3">
                <motion.span 
                  animate={{ scale: [1, 1.5, 1], opacity: [0.75, 0.4, 0.75] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="absolute inline-flex h-full w-full rounded-full bg-red-400"
                />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 ring-2 ring-white" />
              </div>
            )}
          </button>

          {/* Vencidas */}
          <button 
            onClick={() => navigate('/calendario')}
            className="flex items-center space-x-3 bg-red-50 text-red-700 px-6 py-2 rounded-xl border border-red-100 shadow-sm transition-all hover:shadow-md hover:scale-105 active:scale-95 cursor-pointer min-w-[140px]" 
            title="Ver Tareas Vencidas"
          >
            <AlertCircle className="w-5 h-5" />
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-bold uppercase leading-none mb-0.5">Vencidas</span>
              <span className="text-xl font-mono font-black leading-none">{vencidas}</span>
            </div>
          </button>

          {/* En Progreso */}
          <button 
            onClick={() => navigate('/calendario')}
            className="flex items-center space-x-3 bg-amber-50 text-amber-700 px-6 py-2 rounded-xl border border-amber-100 shadow-sm transition-all hover:shadow-md hover:scale-105 active:scale-95 cursor-pointer min-w-[150px]" 
            title="Ver Tareas En Progreso"
          >
            <Clock className="w-5 h-5" />
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-bold uppercase leading-none mb-0.5">En Progreso</span>
              <span className="text-xl font-mono font-black leading-none">{enProgreso}</span>
            </div>
          </button>

          {/* Completadas */}
          <div className="flex items-center space-x-3 bg-emerald-50 text-emerald-700 px-6 py-2 rounded-xl border border-emerald-100 shadow-sm transition-all hover:shadow-md min-w-[150px]" title="Completadas">
            <CheckCircle2 className="w-5 h-5" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase leading-none mb-0.5">Completadas</span>
              <span className="text-xl font-mono font-black leading-none">{completadas}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
