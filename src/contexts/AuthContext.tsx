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
        Object.keys(sessionStorage).forEach(key => {
          if (key.startsWith('sb-')) {
            sessionStorage.removeItem(key);
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
    // Extraemos el rol de app_metadata (seguro, no modificable por el usuario)
    const role = authUser.app_metadata?.role || 'docente';
    
    // Extraemos el resto de datos de user_metadata
    const meta = authUser.user_metadata || {};
    
    // Configuramos el usuario inicial sin foto para no bloquear el login
    setUser({
      id: authUser.id,
      email: authUser.email || '',
      role: role as Role,
      name: meta.name || '',
      documento: meta.documento || '',
      facultad: meta.facultad || '',
      programa: meta.programa || '',
      team_area: meta.team_area || '',
      photoURL: '',
      last_access: ''
    });
    setAuthError(null);
    setLoading(false);

    // Actualizamos el último acceso y obtenemos la foto de perfil en segundo plano
    (async () => {
      try {
        // Sincronizar permisos de la BD al frontend
        const { data: permData, error: permError } = await supabase.from('role_permissions').select('*');
        if (!permError && permData && permData.length > 0) {
          const { getStoredRolePermissions, saveLocalPermissions } = await import('../lib/permissions');
          const mergedPolicies = { ...getStoredRolePermissions() };
          permData.forEach(row => {
            if (row.role && row.permissions) mergedPolicies[row.role] = { ...mergedPolicies[row.role], ...row.permissions };
          });
          saveLocalPermissions(mergedPolicies);
          window.dispatchEvent(new Event('permissionsUpdated'));
        }

        const now = new Date().toISOString();
        
        // Actualizar último acceso
        await supabase
          .from('profiles')
          .update({ last_access: now })
          .eq('id', authUser.id);

        const { data } = await supabase
          .from('profiles')
          .select('photoURL, last_access')
          .eq('id', authUser.id)
          .single();
          
        if (data) {
          setUser(prev => prev ? { 
            ...prev, 
            photoURL: data.photoURL || prev.photoURL,
            last_access: data.last_access || now
          } : null);
        }
      } catch (e) {
        console.error('Error fetching profile photo:', e);
      }
    })();
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
        if (err?.message !== 'Failed to fetch') {
          console.error('Error fetching session:', err);
        }
        if (isMounted) {
          const errorMessage = err?.message?.toLowerCase() || '';
          if (errorMessage.includes('refresh token') || errorMessage.includes('session') || errorMessage.includes('failed to fetch')) {
            // Force clear storage just in case
            Object.keys(localStorage).forEach(key => {
              if (key.startsWith('sb-')) {
                localStorage.removeItem(key);
              }
            });
            Object.keys(sessionStorage).forEach(key => {
              if (key.startsWith('sb-')) {
                sessionStorage.removeItem(key);
              }
            });
            await supabase.auth.signOut().catch(() => {});
            setUser(null);
            setAuthError(null);
            // Don't show confusing error for Failed to fetch
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
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('sb-')) {
          sessionStorage.removeItem(key);
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
