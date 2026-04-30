import React, { ReactNode } from 'react';
import { usePermissions } from '../hooks/usePermissions';
import { AppModule, Action } from '../lib/permissions';

interface PermissionGuardProps {
  module: AppModule;
  action: Action;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Utiliza este wrapper para mostrar y ocultar partes cruciales de la UI basándose en roles 
 * (ejemplo: un botón de "Eliminar Curso" o de "Aprobar Documento")
 * 
 * <PermissionGuard module="courses" action="delete" fallback={<span>Sin acceso</span>}>
 *   <button>Eliminar Curso</button>
 * </PermissionGuard>
 */
export function PermissionGuard({ module, action, children, fallback = null }: PermissionGuardProps) {
  const { can } = usePermissions();

  if (!can(module, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
