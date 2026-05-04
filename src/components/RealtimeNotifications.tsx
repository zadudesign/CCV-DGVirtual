import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast, Toaster } from 'react-hot-toast';
import { Bell, Newspaper } from 'lucide-react';
import WelcomeModal from './WelcomeModal';

export function RealtimeNotifications() {
  const { user } = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (user && !sessionStorage.getItem('welcome_shown')) {
      setShowWelcome(true);
      sessionStorage.setItem('welcome_shown', 'true');
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Listen for new tasks
    const tasksSubscription = supabase
      .channel('realtime-tasks')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificaciones_tareas' },
        (payload) => {
          const nuevaTarea = payload.new as any;
          const userArea = user.team_area || user.role;
          
          // Show toast if task is assigned to this user OR to this user's area/role OR user is admin
          if (
            user.role === 'admin' ||
            nuevaTarea.usuario_id === user.id ||
            nuevaTarea.rol_destino === userArea
          ) {
            setShowWelcome(true);
            toast.custom((t) => (
              <div
                className={`${
                  t.visible ? 'animate-enter' : 'animate-leave'
                } max-w-md w-full bg-white shadow-xl rounded-xl border-l-[6px] border-primary pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
              >
                <div className="flex-1 w-0 p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 pt-0.5">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bell className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-bold text-gray-900">
                        Nueva Tarea Asignada
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {nuevaTarea.titulo}
                      </p>
                      {nuevaTarea.proyecto && (
                        <p className="mt-1 text-xs font-semibold text-primary">
                          {nuevaTarea.proyecto}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex border-l border-gray-200">
                  <button
                    onClick={() => toast.dismiss(t.id)}
                    className="w-full border border-transparent rounded-none rounded-r-xl p-4 flex items-center justify-center text-sm font-medium text-primary hover:text-primary-hover focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            ), { duration: 5000 });
          }
        }
      )
      .subscribe();

    // Listen for new novedades
    const novedadesSubscription = supabase
      .channel('realtime-novedades')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'novedades_curso' },
        (payload) => {
          const nuevaNovedad = payload.new as any;
          
          setShowWelcome(true);
          // Let's show to everyone or maybe just if we want to limit
          toast.custom((t) => (
            <div
              className={`${
                t.visible ? 'animate-enter' : 'animate-leave'
              } max-w-md w-full bg-white shadow-xl rounded-xl border-l-[6px] border-accent pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
            >
              <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 pt-0.5">
                    <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
                      <Newspaper className="h-5 w-5 text-accent" />
                    </div>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-bold text-gray-900">
                      Nueva Novedad de Curso
                    </p>
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                      {nuevaNovedad.titulo}
                    </p>
                    <span className={`inline-block mt-2 px-2 py-1 text-xs font-bold rounded-full ${
                      nuevaNovedad.estado === 'Urgente' ? 'bg-red-100 text-red-700' :
                      nuevaNovedad.estado === 'Importante' ? 'bg-amber-100 text-amber-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {nuevaNovedad.estado}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex border-l border-gray-200">
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="w-full border border-transparent rounded-none rounded-r-xl p-4 flex items-center justify-center text-sm font-medium text-accent hover:text-accent-hover focus:outline-none"
                >
                  Cerrar
                </button>
              </div>
            </div>
          ), { duration: 6000 });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tasksSubscription);
      supabase.removeChannel(novedadesSubscription);
    };
  }, [user]);

  return (
    <>
      <Toaster position="top-right" />
      {showWelcome && user && <WelcomeModal user={user} onClose={() => setShowWelcome(false)} />}
    </>
  );
}
