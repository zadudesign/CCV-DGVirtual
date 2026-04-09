import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  Settings, 
  LogOut,
  Menu,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { NotificacionTarea } from '../types';
import { startOfDay, parseISO, differenceInDays } from 'date-fns';

export default function Layout() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [allTasks, setAllTasks] = useState<NotificacionTarea[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (user) {
      fetchTasks();
      
      // Subscribe to changes
      const subscription = supabase
        .channel('notificaciones_cambios')
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
      let query = supabase
        .from('notificaciones_tareas')
        .select('*, curso:cursos(nombre)')
        .order('fecha_vencimiento', { ascending: true });

      if (user?.role !== 'admin') {
        if (['Soporte', 'Multimedia', 'Diseño', 'Pedagogía', 'team'].includes(user?.role || '')) {
          const area = user?.team_area || user?.role;
          query = query.or(`usuario_id.eq.${user?.id},rol_destino.eq.${area}`);
        } else {
          query = query.or(`usuario_id.eq.${user?.id},rol_destino.eq.${user?.role}`);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setAllTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const pendingTasks = allTasks.filter(t => t.estado !== 'Completada' && t.estado !== 'Completado');
  
  // Calculate stats
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

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Cursos', href: '/cursos', icon: BookOpen },
    { name: 'Calendario de Trabajo', href: '/calendario', icon: CalendarDays },
    // Usuarios is for admin, decano, and coordinador
    ...(user.role === 'admin' || user.role === 'decano' || user.role === 'coordinador' 
      ? [{ name: 'Usuarios', href: '/usuarios', icon: Users }] 
      : []),
    { name: 'Configuración', href: '/configuracion', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <span className="text-xl font-bold text-slate-900">CCV Platform</span>
        </div>
        
        <div className="flex-1 py-6 px-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
                  isActive 
                    ? "bg-indigo-50 text-indigo-700" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon className={cn("mr-3 h-5 w-5", isActive ? "text-indigo-700" : "text-slate-400")} />
                {item.name}
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center mb-4">
            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
              {user.name.charAt(0)}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-slate-900">{user.name}</p>
              <p className="text-xs text-slate-500 capitalize">{user.role}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <button className="md:hidden p-2 text-slate-400 hover:text-slate-500">
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex-1 flex justify-end items-center space-x-4">
            {/* Tareas Stats */}
            <div className="hidden sm:flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider mr-1">Tareas:</span>
              <div className="flex items-center space-x-1 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200" title="Completadas">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-bold">{completadas}</span>
              </div>
              <div className="flex items-center space-x-1 bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200" title="En Progreso">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-bold">{enProgreso}</span>
              </div>
              <div className="flex items-center space-x-1 bg-red-100 text-red-800 px-2 py-0.5 rounded-md border border-red-200" title="Vencidas">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-bold">{vencidas}</span>
              </div>
            </div>

            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-slate-400 hover:text-slate-500 relative focus:outline-none"
              >
                <Bell className="h-6 w-6" />
                {pendingTasks.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 ring-2 ring-white"></span>
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-slate-800">Notificaciones</h3>
                    <span className="text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                      {pendingTasks.length} pendientes
                    </span>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {pendingTasks.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-slate-500">
                        No tienes tareas pendientes. ¡Buen trabajo!
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {pendingTasks.slice(0, 5).map((task) => (
                          <Link 
                            key={task.id} 
                            to="/calendario"
                            onClick={() => setShowNotifications(false)}
                            className="block px-4 py-3 hover:bg-slate-50 transition-colors"
                          >
                            <p className="text-sm font-medium text-slate-800 truncate">{task.titulo}</p>
                            {task.curso?.nombre && (
                              <p className="text-xs text-slate-500 truncate mt-0.5">{task.curso.nombre}</p>
                            )}
                            {task.fecha_vencimiento && (
                              <p className="text-xs text-indigo-600 mt-1 font-medium">
                                Vence: {new Date(task.fecha_vencimiento).toLocaleDateString()}
                              </p>
                            )}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="px-4 py-2 border-t border-slate-100 bg-slate-50">
                    <Link 
                      to="/calendario" 
                      onClick={() => setShowNotifications(false)}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-700 block text-center"
                    >
                      Ver todas mis tareas
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
