import { Role, User } from '../types';

export type AppModule = 
  | 'courses'
  | 'documents'
  | 'users'
  | 'reports'
  | 'settings'
  | 'deliveries'
  | 'notifications';

export type Action = 'view' | 'edit' | 'create' | 'delete';

// Un mapa de módulos y las acciones permitidas en ellos
export type PermissionsMap = {
  [key in AppModule]?: Action[];
};

// Políticas asociadas a cada Rol
export type RolePolicies = {
  [key in string]: PermissionsMap;
};

const STORAGE_KEY = 'app_role_permissions';

export const DEFAULT_ROLE_PERMISSIONS: RolePolicies = {
  admin: {
    courses: ['view', 'create', 'edit', 'delete'],
    users: ['view', 'create', 'edit', 'delete'],
    settings: ['view', 'edit'],
    reports: ['view'],
    documents: ['view', 'create', 'edit', 'delete'],
    deliveries: ['view', 'create', 'edit', 'delete'],
    notifications: ['view', 'create', 'edit', 'delete'],
  },
  team: {
    courses: ['view', 'create', 'edit'],
    users: ['view'],
    reports: ['view'],
    documents: ['view', 'create', 'edit', 'delete'],
    deliveries: ['view', 'create', 'edit'],
    notifications: ['view', 'create'],
  },
  decano: {
    courses: ['view'],
    reports: ['view'],
    documents: ['view'],
    deliveries: ['view'],
  },
  coordinador: {
    courses: ['view'],
    reports: ['view'],
    documents: ['view'],
    deliveries: ['view'],
  },
  docente: {
    courses: ['view', 'edit'], 
    documents: ['view', 'create', 'edit'],
    deliveries: ['view', 'create'],
    notifications: ['view'],
  },
  evaluador: {
    courses: ['view'],
    documents: ['view'],
    deliveries: ['view'],
  },
  // Roles de soporte técnico y creadores de contenido
  Soporte: {
    courses: ['view', 'edit'],
    documents: ['view', 'edit'],
    deliveries: ['view'],
  },
  Multimedia: {
    courses: ['view', 'edit'],
    documents: ['view', 'create', 'edit'],
  },
  Diseño: {
    courses: ['view', 'edit'],
    documents: ['view', 'create', 'edit'],
  },
  Pedagogía: {
    courses: ['view', 'edit'],
    documents: ['view', 'create', 'edit'],
  }
};

/**
 * Obtiene los permisos guardados. Para integrarse con Supabase de forma síncrona
 * en el primer render, usaremos una caché en localStorage.
 * Pero se provee `fetchPermissionsFromDB` para actualizar esta caché y
 * `saveRolePermissionsToDB` para guardarlos.
 */
export function getStoredRolePermissions(): RolePolicies {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Hacemos merge con DEFAULT por si hay roles o campos nuevos que no estaban guardados
      const merged: RolePolicies = { ...DEFAULT_ROLE_PERMISSIONS };
      for (const role in parsed) {
        if (merged[role]) {
          merged[role] = { ...merged[role], ...parsed[role] };
        } else {
          merged[role] = parsed[role];
        }
      }
      return merged;
    }
  } catch (e) {
    console.error("Error reading role permissions", e);
  }
  return DEFAULT_ROLE_PERMISSIONS;
}

/**
 * Guarda los permisos localmente (uso síncrono rápido y fallback)
 */
export function saveLocalPermissions(permissions: RolePolicies) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(permissions));
}

/**
 * Función legacy/actual para compatibilidad con código existente
 */
export function getRolePermissions(): RolePolicies {
  return getStoredRolePermissions();
}

/**
 * Valida si un usuario específico tiene el permiso para un módulo y una acción concretos.
 * 
 * @param user - El usuario cuyo rol quieres validar.
 * @param module - El módulo al que está intentando acceder.
 * @param action - La acción (ver, editar, etc).
 * @returns boolean
 */
export function hasPermission(user: User | null | undefined, module: AppModule, action: Action): boolean {
  if (!user || !user.role) return false;
  
  const policies = getStoredRolePermissions();
  const userPermissions = policies[user.role] || DEFAULT_ROLE_PERMISSIONS[user.role];
  if (!userPermissions) return false;
  
  const modulePermissions = userPermissions[module];
  if (!modulePermissions) return false;
  
  return modulePermissions.includes(action);
}
