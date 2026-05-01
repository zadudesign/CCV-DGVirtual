import { Role, User } from '../types';

export type AppModule = 
  | 'dashboard'
  | 'malla'
  | 'courses'
  | 'calendar'
  | 'educacion_continua'
  | 'documents'
  | 'users'
  | 'reports'
  | 'settings'
  | 'deliveries'
  | 'notifications';

export type Action = 
  | 'view' 
  | 'edit' 
  | 'create' 
  | 'delete'
  | 'tab_solicitudes'
  | 'tab_lista'
  | 'tab_finalizados'
  | 'tab_registrados'
  | 'tab_inscribir'
  | 'tab_facultades'
  | 'tab_perfil'
  | 'tab_ui'
  | 'tab_parametros'
  | 'tab_reportes'
  | 'tab_logs'
  | 'tab_modulos'
  | 'tab_permisos'
  | 'tab_equipo'
  | 'tab_tareas'
  | 'tab_stats';

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
    dashboard: ['view'],
    malla: ['view'],
    courses: ['view', 'create', 'edit', 'delete', 'tab_solicitudes', 'tab_lista', 'tab_finalizados'],
    calendar: ['view'],
    educacion_continua: ['view', 'tab_equipo', 'tab_tareas', 'tab_stats'],
    users: ['view', 'create', 'edit', 'delete', 'tab_registrados', 'tab_inscribir', 'tab_facultades'],
    settings: ['view', 'edit', 'tab_perfil', 'tab_ui', 'tab_parametros', 'tab_reportes', 'tab_logs', 'tab_modulos', 'tab_permisos'],
    reports: ['view'],
    documents: ['view', 'create', 'edit', 'delete'],
    deliveries: ['view', 'create', 'edit', 'delete'],
    notifications: ['view', 'create', 'edit', 'delete'],
  },
  team: {
    dashboard: ['view'],
    malla: ['view'],
    courses: ['view', 'create', 'edit', 'tab_solicitudes', 'tab_lista', 'tab_finalizados'],
    calendar: ['view'],
    educacion_continua: ['view', 'tab_equipo', 'tab_tareas', 'tab_stats'],
    users: ['view', 'tab_registrados', 'tab_facultades'],
    settings: ['view', 'tab_perfil'],
    reports: ['view'],
    documents: ['view', 'create', 'edit', 'delete'],
    deliveries: ['view', 'create', 'edit'],
    notifications: ['view', 'create'],
  },
  decano: {
    dashboard: ['view'],
    malla: ['view'],
    courses: ['view', 'tab_solicitudes', 'tab_lista', 'tab_finalizados'],
    calendar: ['view'],
    users: ['view', 'tab_registrados', 'tab_facultades'],
    settings: ['view', 'tab_perfil'],
    reports: ['view'],
    documents: ['view'],
    deliveries: ['view'],
  },
  coordinador: {
    dashboard: ['view'],
    malla: ['view'],
    courses: ['view', 'tab_solicitudes', 'tab_lista', 'tab_finalizados'],
    calendar: ['view'],
    users: ['view', 'tab_registrados', 'tab_facultades'],
    settings: ['view', 'tab_perfil'],
    reports: ['view'],
    documents: ['view'],
    deliveries: ['view'],
  },
  docente: {
    dashboard: ['view'],
    malla: ['view'],
    courses: ['view', 'edit', 'tab_lista', 'tab_finalizados'],
    calendar: ['view'],
    settings: ['view', 'tab_perfil'],
    documents: ['view', 'create', 'edit'],
    deliveries: ['view', 'create'],
    notifications: ['view'],
  },
  evaluador: {
    dashboard: ['view'],
    malla: ['view'],
    courses: ['view', 'tab_lista', 'tab_finalizados'],
    calendar: ['view'],
    settings: ['view', 'tab_perfil'],
    documents: ['view'],
    deliveries: ['view'],
  },
  // Roles de soporte técnico y creadores de contenido
  Soporte: {
    dashboard: ['view'],
    malla: ['view'],
    courses: ['view', 'edit', 'tab_solicitudes', 'tab_lista', 'tab_finalizados'],
    calendar: ['view'],
    educacion_continua: ['view', 'tab_equipo', 'tab_tareas', 'tab_stats'],
    settings: ['view', 'tab_perfil'],
    documents: ['view', 'edit'],
    deliveries: ['view'],
  },
  Multimedia: {
    dashboard: ['view'],
    malla: ['view'],
    courses: ['view', 'edit', 'tab_solicitudes', 'tab_lista', 'tab_finalizados'],
    calendar: ['view'],
    educacion_continua: ['view', 'tab_equipo', 'tab_tareas', 'tab_stats'],
    settings: ['view', 'tab_perfil'],
    documents: ['view', 'create', 'edit'],
  },
  Diseño: {
    dashboard: ['view'],
    malla: ['view'],
    courses: ['view', 'edit', 'tab_solicitudes', 'tab_lista', 'tab_finalizados'],
    calendar: ['view'],
    educacion_continua: ['view', 'tab_equipo', 'tab_tareas', 'tab_stats'],
    settings: ['view', 'tab_perfil'],
    documents: ['view', 'create', 'edit'],
  },
  Pedagogía: {
    dashboard: ['view'],
    malla: ['view'],
    courses: ['view', 'edit', 'tab_solicitudes', 'tab_lista', 'tab_finalizados'],
    calendar: ['view'],
    educacion_continua: ['view', 'tab_equipo', 'tab_tareas', 'tab_stats'],
    settings: ['view', 'tab_perfil'],
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
  
  // Hardcoded safety net for admin
  if (user.role === 'admin') {
    if (module === 'settings' && ['view', 'tab_perfil', 'tab_permisos'].includes(action)) {
      return true;
    }
  }

  const policies = getStoredRolePermissions();
  const userPermissions = policies[user.role] || DEFAULT_ROLE_PERMISSIONS[user.role];
  if (!userPermissions) return false;
  
  const modulePermissions = userPermissions[module];
  if (!modulePermissions) return false;
  
  return modulePermissions.includes(action);
}
