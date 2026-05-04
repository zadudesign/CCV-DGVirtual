import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { BookOpen, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import logoPccv from '../assets/logo_pccv.svg';

export default function Login() {
  const { user, loading: authLoading, authError, refreshSession } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  React.useEffect(() => {
    if (authError) {
      setLoading(false);
    }
  }, [authError]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const displayError = error || authError;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        if (signInError.message === 'Failed to fetch') {
          setError('Error de conexión con la base de datos (Supabase). No se pudo realizar la petición fetch.');
        } else {
          setError(signInError.message);
        }
        setLoading(false);
      } else {
        // En lugar de recargar la página (lo cual falla en algunos iframes),
        // forzamos al AuthContext a leer la sesión recién creada.
        await refreshSession();
        setLoading(false); // Detener el spinner local para que se muestren los errores si falla el perfil
      }
    } catch (err: any) {
      if (err.message === 'Failed to fetch') {
        setError('Error de conexión con la base de datos (Supabase). No se pudo realizar la petición fetch.');
      } else {
        setError(err.message || 'Error al iniciar sesión');
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden bg-slate-900">
      {/* Background Gradient & Decorative Blobs */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/40 blur-[120px]"></div>
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[60%] rounded-full bg-accent/20 blur-[120px]"></div>
        <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[50%] rounded-full bg-secondary/30 blur-[120px]"></div>
      </div>

      {/* Patrón de puntos sutil */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none opacity-30"
        style={{ 
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.3) 1px, transparent 1px)', 
          backgroundSize: '24px 24px' 
        }}
      ></div>
      
      {/* Overlay sutil para mejorar la textura */}
      <div className="fixed inset-0 z-0 bg-slate-900/60 backdrop-blur-[1px] pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center relative">
          {/* Efecto de resplandor/difuminado detrás del logo */}
          <img 
            src={logoPccv}
            alt="" 
            className="absolute h-24 w-auto object-contain blur-xl opacity-40 scale-110 pointer-events-none"
            aria-hidden="true"
          />
          {/* Logo principal */}
          <img 
            src={logoPccv}
            alt="Logo Plataforma" 
            className="h-24 w-auto object-contain drop-shadow-lg relative z-10"
            referrerPolicy="no-referrer"
          />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
          Plataforma
        </h2>
        <div className="text-center mt-3">
          <p className="text-sm text-white font-medium bg-white/10 border border-white/20 inline-block px-4 py-1 rounded-full backdrop-blur-md shadow-sm">
            Construcción de Cursos Virtuales
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white/90 backdrop-blur-md py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-white/50">
          {displayError && (
            <div className="mb-4 rounded-md bg-red-50 p-4 border border-red-200">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{displayError}</p>
                </div>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-main">
                Correo Electrónico
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-muted rounded-lg shadow-sm placeholder-secondary focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-main">
                Contraseña
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-muted rounded-lg shadow-sm placeholder-secondary focus:outline-none focus:ring-primary focus:border-primary sm:text-sm pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary hover:text-primary"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Ingresar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
