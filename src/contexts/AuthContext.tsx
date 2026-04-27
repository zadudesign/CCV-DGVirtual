import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Role } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  authError: string | null;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const refreshSession = async () => {
    setLoading(true);
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      
      if (session?.user) {
        await setUserFromSession(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Error refreshing session:', err);
      const errorMessage = err?.message?.toLowerCase() || '';
      if (errorMessage.includes('refresh token') || errorMessage.includes('session')) {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-')) {
            localStorage.removeItem(key);
          }
        });
        await supabase.auth.signOut().catch(() => {});
        setAuthError(null);
      } else {
        setAuthError('Error al actualizar la sesión.');
      }
      setUser(null);
      setLoading(false);
    }
  };

  const setUserFromSession = async (authUser: any) => {
    // Extraemos el rol de app_metadata como respaldo inicial
    let role = authUser.app_metadata?.role || 'docente';
    
    // Extraemos el resto de datos de user_metadata
    const meta = authUser.user_metadata || {};
    
    // 1. Obtenemos el perfil completo (incluyendo el ROL real de la DB) ANTES de terminar el loading
    let dbProfile = null;
    try {
      const now = new Date().toISOString();
      
      // Actualizar último acceso (sin bloquear si falla)
      supabase.from('profiles').update({ last_access: now }).eq('id', authUser.id).then();

      const { data } = await supabase
        .from('profiles')
        .select('photoURL, last_access, role')
        .eq('id', authUser.id)
        .single();
      
      dbProfile = data;
    } catch (e) {
      console.error('Error fetching profile data (pre-loading):', e);
    }

    // Si tenemos datos de la DB, priorizamos ese rol
    if (dbProfile?.role) {
      role = dbProfile.role;
    }

    // Configuramos el usuario final
    setUser({
      id: authUser.id,
      email: authUser.email || '',
      role: role as Role,
      name: meta.name || '',
      documento: meta.documento || '',
      facultad: meta.facultad || '',
      programa: meta.programa || '',
      team_area: meta.team_area || '',
      photoURL: dbProfile?.photoURL || '',
      last_access: dbProfile?.last_access || ''
    });
    
    setAuthError(null);
    setLoading(false);
  };

  useEffect(() => {
    let isMounted = true;

    // Failsafe timeout
    const timeoutId = setTimeout(() => {
      if (isMounted && loading) setLoading(false);
    }, 8000);

    const fetchSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (session?.user) {
          if (isMounted) await setUserFromSession(session.user);
        } else {
          if (isMounted) setLoading(false);
        }
      } catch (err: any) {
        console.error('Error fetching session:', err);
        if (isMounted) {
          const errorMessage = err?.message?.toLowerCase() || '';
          if (errorMessage.includes('refresh token') || errorMessage.includes('session')) {
            // Force clear local storage just in case
            Object.keys(localStorage).forEach(key => {
              if (key.startsWith('sb-')) {
                localStorage.removeItem(key);
              }
            });
            await supabase.auth.signOut().catch(() => {});
            setUser(null);
            setAuthError(null);
          } else {
            setAuthError('Error de conexión. Verifica la configuración de Supabase.');
          }
          setLoading(false);
        }
      }
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        if (isMounted) await setUserFromSession(session.user);
      } else {
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-')) {
          localStorage.removeItem(key);
        }
      });
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    } finally {
      setUser(null);
      setAuthError(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, authError, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
