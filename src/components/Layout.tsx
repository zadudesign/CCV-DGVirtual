import React, { useState } from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isTeamRole = ['team', 'Soporte', 'Multimedia', 'Diseño', 'Pedagogía'].includes(user.role || '');

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

  return (
    <div className="min-h-screen bg-background flex text-text-main">
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
        <header className="h-16 bg-white border-b border-muted/50 flex items-center justify-between px-4 sm:px-6 lg:px-8 shadow-sm z-10">
          <button 
            className="md:hidden p-2 text-slate-400 hover:text-secondary"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex-1 flex justify-end items-center space-x-4">
            <div className="flex items-center border-slate-100">
              <button
                onClick={signOut}
                className="flex items-center px-4 py-2 text-sm font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 group border border-transparent hover:border-red-100 shadow-sm hover:shadow-md bg-white"
                title="Cerrar Sesión"
              >
                <LogOut className="mr-2.5 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                <span>Cerrar Sesión</span>
              </button>
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
