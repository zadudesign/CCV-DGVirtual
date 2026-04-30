import { useAuth } from '../contexts/AuthContext';
import { hasPermission, AppModule, Action } from '../lib/permissions';

/**
 * Hook para exponer la funcionalidad de verificación de permisos en componentes React de manera aislada.
 * Utiliza el AuthContext para obtener el perfil del usuario activo instanciándolo una sola vez.
 */
export function usePermissions() {
  const { user } = useAuth();

  /**
   * Chequea si el usuario actual puede realizar una acción en el módulo dado
   */
  const can = (module: AppModule, action: Action): boolean => {
    return hasPermission(user, module, action);
  };

  /**
   * Chequea si el usuario tiene el permiso; si no, arroja un booleano (útil para protecciones de rutEo)
   */
  const isAuthorized = (module: AppModule, action: Action) => {
    return can(module, action);
  };

  return { can, isAuthorized };
}
