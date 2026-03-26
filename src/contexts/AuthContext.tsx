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
        setUserFromSession(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Error refreshing session:', err);
      setUser(null);
      setAuthError('Error al actualizar la sesión.');
      setLoading(false);
    }
  };

  const setUserFromSession = (authUser: any) => {
    // Extraemos el rol de app_metadata (seguro, no modificable por el usuario)
    const role = authUser.app_metadata?.role || 'docente';
    
    // Extraemos el resto de datos de user_metadata
    const meta = authUser.user_metadata || {};
    
    setUser({
      id: authUser.id,
      email: authUser.email || '',
      role: role as Role,
      name: meta.name || '',
      documento: meta.documento || '',
      facultad: meta.facultad || '',
      programa: meta.programa || ''
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
          if (isMounted) setUserFromSession(session.user);
        } else {
          if (isMounted) setLoading(false);
        }
      } catch (err: any) {
        console.error('Error fetching session:', err);
        if (isMounted) {
          const errorMessage = err?.message?.toLowerCase() || '';
          if (errorMessage.includes('refresh token')) {
            await supabase.auth.signOut().catch(console.error);
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
        if (isMounted) setUserFromSession(session.user);
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
