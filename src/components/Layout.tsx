import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { RealtimeNotifications } from './RealtimeNotifications';
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  Settings, 
  LogOut,
  Menu,
  CalendarDays,
  X,
  GraduationCap
} from 'lucide-react';
import { cn } from '../lib/utils';
import logoCCV from '../assets/logo_pccv.svg';

export default function Layout() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isTeamRole = ['team', 'Soporte', 'Multimedia', 'Diseño', 'Pedagogía', 'educacion_continua'].includes(user.role || '');

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Cursos', href: '/cursos', icon: BookOpen },
    { name: 'Calendario de Trabajo', href: '/calendario', icon: CalendarDays },
    // Educación Continua is for Team roles and admin
    ...(isTeamRole || user.role === 'admin'
      ? [{ name: 'Educación Continua', href: '/educacion-continua', icon: GraduationCap }] 
      : []),
    // Usuarios is for admin, decano, and coordinador
    ...(user.role === 'admin' || user.role === 'decano' || user.role === 'coordinador' 
      ? [{ name: 'Usuarios', href: '/usuarios', icon: Users }] 
      : []),
    { name: 'Configuración', href: '/configuracion', icon: Settings },
  ];

  // Map paths to titles and icons
  const getPageInfo = () => {
    let icon = LayoutDashboard;
    let title = 'Plataforma CCV';

    if (location.pathname === '/') {
      icon = LayoutDashboard;
      switch (user.role) {
        case 'admin': title = 'Panel de Administración'; break;
        case 'decano': title = 'Dashboard Decano'; break;
        case 'coordinador': title = 'Dashboard Coordinador'; break;
        case 'docente': title = 'Panel del Docente'; break;
        case 'evaluador': title = 'Panel del Evaluador'; break;
        case 'team':
        case 'educacion_continua':
        case 'Soporte':
        case 'Multimedia':
        case 'Diseño':
        case 'Pedagogía':
          title = 'Dashboard de Operaciones'; break;
        default: title = 'Dashboard'; break;
      }
    } else {
      const navItem = navigation.find(item => item.href === location.pathname);
      if (navItem) {
        title = navItem.name;
        icon = navItem.icon;
      } else if (location.pathname.startsWith('/cursos/')) {
        title = 'Detalle del Curso';
        icon = BookOpen;
      }
    }
    
    return { title, icon };
  };

  const { title: pageTitle, icon: PageIcon } = getPageInfo();

  return (
    <div className="min-h-screen bg-background flex text-text-main">
      <RealtimeNotifications />
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-primary text-white shadow-xl">
            <div className="absolute top-0 right-0 -mr-12 pt-4">
              <button
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="sr-only">Cerrar menú</span>
                <X className="h-6 w-6 text-white" aria-hidden="true" />
              </button>
            </div>
            <div className="h-16 flex items-center px-6 border-b border-primary-hover space-x-3">
              <span className="text-xl font-bold text-white tracking-wide">Plataforma</span>
              <img src={logoCCV} alt="Logo CCV" className="h-8 w-auto" />
            </div>
            
            {/* User Profile Section */}
            <div className="flex flex-col items-center py-8 px-4 border-b border-primary-hover">
              <div className="h-24 w-24 rounded-full bg-accent flex items-center justify-center text-primary text-4xl font-bold shadow-lg mb-4 overflow-hidden">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  user.name.charAt(0)
                )}
              </div>
              <h2 className="text-xl font-bold text-white uppercase tracking-wider text-center">{user.name}</h2>
              <p className="text-sm text-slate-400 text-center mt-1">{user.email}</p>
              <span className="mt-3 px-3 py-1 rounded-full text-xs font-medium bg-primary-hover text-accent capitalize border border-accent/20">
                {user.role}
              </span>
            </div>
            
            <div className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                      isActive 
                        ? "bg-primary-hover text-accent shadow-sm" 
                        : "text-slate-300 hover:bg-primary-hover hover:text-white"
                    )}
                  >
                    <item.icon className={cn("mr-3 h-5 w-5", isActive ? "text-accent" : "text-secondary")} />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Sidebar (Desktop) */}
      <div className="w-64 bg-primary text-white flex flex-col hidden md:flex shadow-xl z-10">
        <div className="h-16 flex items-center px-6 border-b border-primary-hover space-x-3">
          <span className="text-xl font-bold text-white tracking-wide">Plataforma</span>
          <img src={logoCCV} alt="Logo CCV" className="h-8 w-auto" />
        </div>
        
        {/* User Profile Section */}
        <div className="flex flex-col items-center py-8 px-4 border-b border-primary-hover">
          <div className="h-24 w-24 rounded-full bg-accent flex items-center justify-center text-primary text-4xl font-bold shadow-lg mb-4 overflow-hidden">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.name} className="h-full w-full object-cover" />
            ) : (
              user.name.charAt(0)
            )}
          </div>
          <h2 className="text-xl font-bold text-white uppercase tracking-wider text-center">{user.name}</h2>
          <p className="text-sm text-slate-400 text-center mt-1">{user.email}</p>
          <span className="mt-3 px-3 py-1 rounded-full text-xs font-medium bg-primary-hover text-accent capitalize border border-accent/20">
            {user.role}
          </span>
        </div>
        
        <div className="flex-1 py-6 px-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                  isActive 
                    ? "bg-primary-hover text-accent shadow-sm" 
                    : "text-slate-300 hover:bg-primary-hover hover:text-white"
                )}
              >
                <item.icon className={cn("mr-3 h-5 w-5", isActive ? "text-accent" : "text-secondary")} />
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-20 bg-white border-b border-muted/30 flex items-center justify-between px-4 sm:px-6 lg:px-10 shadow-[0_1px_3px_0_rgba(0,0,0,0.02)] z-10">
          <div className="flex items-center space-x-4">
            <button 
              className="md:hidden p-2 text-slate-400 hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-lg"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 shadow-sm">
                <PageIcon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex flex-col justify-center">
                <h1 className="text-xl sm:text-2xl font-bold text-primary tracking-tight leading-none mb-1">
                  {pageTitle}
                </h1>
                <p className="hidden sm:block text-[10px] font-bold text-secondary uppercase tracking-[0.2em] opacity-60">
                  Creación de Cursos Virtuales &bull; <span className="text-accent underline decoration-accent/30 underline-offset-2">CCV</span>
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="hidden lg:flex items-center px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse mr-2"></div>
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                Sistema Activo &bull; <span className="ml-1 text-slate-400 font-medium tracking-normal">{currentTime.toLocaleString('es-ES', { 
                  day: '2-digit', 
                  month: 'short', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                }).replace(',', '')}</span>
              </span>
            </div>
            
            <div className="h-8 w-px bg-slate-100 hidden sm:block mx-2"></div>
            
            <button
              onClick={signOut}
              className="flex items-center px-4 py-2 text-sm font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 group border border-transparent hover:border-red-100 shadow-sm hover:shadow-md bg-white overflow-hidden"
              title="Cerrar Sesión"
            >
              <LogOut className="mr-2.5 h-4 w-4 transition-transform group-hover:-translate-x-1" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
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
