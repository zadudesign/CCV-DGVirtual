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
        await fetchProfile(session.user.id, session.user.email || '');
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

  useEffect(() => {
    let isMounted = true;

    // Failsafe timeout: si Supabase no responde en 8 segundos, forzamos el fin de la carga
    const timeoutId = setTimeout(() => {
      if (isMounted && loading) {
        setLoading(false);
      }
    }, 8000);

    const fetchSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (session?.user) {
          await fetchProfile(session.user.id, session.user.email || '');
        } else {
          if (isMounted) setLoading(false);
        }
      } catch (err: any) {
        console.error('Error fetching session:', err);
        if (isMounted) {
          // Si el error es por un token de refresco inválido, simplemente cerramos la sesión
          const errorMessage = err?.message?.toLowerCase() || '';
          if (errorMessage.includes('refresh token') || errorMessage.includes('refresh_token')) {
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
        await fetchProfile(session.user.id, session.user.email || '');
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

  const fetchProfile = async (userId: string, email: string) => {
    try {
      setAuthError(null);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        setAuthError('No se encontró un perfil asignado a este usuario. Contacte al administrador.');
        await supabase.auth.signOut();
        setUser(null);
      } else if (data) {
        setUser({
          id: data.id,
          email: data.email || email,
          role: data.role as Role,
          name: data.name,
          documento: data.documento,
          facultad: data.facultad,
          programa: data.programa
        });
      }
    } catch (err: any) {
      console.error('Unexpected error fetching profile:', err);
      const errorMessage = err?.message?.toLowerCase() || '';
      if (errorMessage.includes('refresh token') || errorMessage.includes('refresh_token')) {
        await supabase.auth.signOut().catch(console.error);
        setAuthError(null);
      } else {
        setAuthError('Error inesperado al cargar el perfil.');
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

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
