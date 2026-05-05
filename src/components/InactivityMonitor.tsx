import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Monitor de inactividad que cierra la sesión del usuario si no se detecta
 * actividad durante el tiempo especificado.
 */
const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 60 minutos en milisegundos

export default function InactivityMonitor() {
  const { user, signOut } = useAuth();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Solo activamos el temporizador si el usuario está autenticado
    if (user) {
      timeoutRef.current = setTimeout(() => {
        console.log('Cerrando sesión por inactividad (60 minutos)');
        signOut();
      }, INACTIVITY_TIMEOUT);
    }
  }, [user, signOut]);

  useEffect(() => {
    // Si no hay usuario, nos aseguramos de limpiar cualquier timer existente
    if (!user) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    // Eventos que reinician el temporizador
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    // Iniciamos el timer al montar o cuando el usuario cambia
    resetTimer();

    // Añadir listeners para detectar actividad
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    // Cleanup al desmontar
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [user, resetTimer]);

  return null;
}
