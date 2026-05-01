import React, { useState, useEffect } from 'react';
import { Shield, Save, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { getStoredRolePermissions, saveLocalPermissions, RolePolicies, Action, AppModule, DEFAULT_ROLE_PERMISSIONS } from '../lib/permissions';
import { supabase } from '../lib/supabase';

const MODULE_CONFIG: Record<AppModule, { label: string, actions: { id: Action, label: string }[] }> = {
  dashboard: { label: 'Inicio', actions: [{ id: 'view', label: 'Ver Módulo' }] },
  malla: { label: 'Malla Curricular', actions: [{ id: 'view', label: 'Ver Módulo' }] },
  courses: { label: 'Oferta Formativa', actions: [
    { id: 'view', label: 'Ver Módulo' }, { id: 'create', label: 'Crear' }, { id: 'edit', label: 'Editar' }, { id: 'delete', label: 'Eliminar' },
    { id: 'tab_solicitudes', label: 'Tab Solicitudes' }, { id: 'tab_lista', label: 'Tab Cursos' }, { id: 'tab_finalizados', label: 'Tab Finalizados' }
  ] },
  calendar: { label: 'Calendario de Trabajo', actions: [{ id: 'view', label: 'Ver Módulo' }] },
  educacion_continua: { label: 'Educación Continua', actions: [
    { id: 'view', label: 'Ver Módulo' }, { id: 'tab_equipo', label: 'Tab Equipo' }, { id: 'tab_tareas', label: 'Tab Tareas' }, { id: 'tab_stats', label: 'Tab Stats' }
  ] },
  users: { label: 'Usuarios', actions: [
    { id: 'view', label: 'Ver Módulo' }, { id: 'create', label: 'Crear' }, { id: 'edit', label: 'Editar' }, { id: 'delete', label: 'Eliminar' },
    { id: 'tab_registrados', label: 'Tab Registrados' }, { id: 'tab_inscribir', label: 'Tab Inscribir' }, { id: 'tab_facultades', label: 'Tab Facultades' }
  ] },
  settings: { label: 'Configuración', actions: [
    { id: 'view', label: 'Ver Módulo' }, { id: 'edit', label: 'Editar' },
    { id: 'tab_perfil', label: 'Tab Perfil' }, { id: 'tab_ui', label: 'Tab UI' }, { id: 'tab_parametros', label: 'Tab Parámetros' }, { id: 'tab_reportes', label: 'Tab Reportes' }, { id: 'tab_logs', label: 'Tab Logs' }, { id: 'tab_modulos', label: 'Tab Módulos' }, { id: 'tab_permisos', label: 'Tab Permisos' }
  ] },
  reports: { label: 'Reportes (Interno)', actions: [{ id: 'view', label: 'Ver' }] },
  documents: { label: 'Documentos', actions: [{ id: 'view', label: 'Ver' }, { id: 'create', label: 'Crear' }, { id: 'edit', label: 'Editar' }, { id: 'delete', label: 'Eliminar' }] },
  deliveries: { label: 'Entregables', actions: [{ id: 'view', label: 'Ver' }, { id: 'create', label: 'Crear' }, { id: 'edit', label: 'Editar' }, { id: 'delete', label: 'Eliminar' }] },
  notifications: { label: 'Notificaciones', actions: [{ id: 'view', label: 'Ver' }, { id: 'create', label: 'Crear' }, { id: 'edit', label: 'Editar' }, { id: 'delete', label: 'Eliminar' }] }
};
const ALL_MODULES = Object.keys(MODULE_CONFIG) as AppModule[];

export function RolePermissionsEditor() {
  const [policies, setPolicies] = useState<RolePolicies>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState('');

  const handleAddRole = () => {
    const trimmed = newRoleName.trim();
    if (!trimmed) return;
    const normalizedRole = trimmed.toLowerCase();
    
    if (policies[normalizedRole] || policies[trimmed]) {
      setErrorMessage(`El rol "${trimmed}" ya existe.`);
      return;
    }

    setPolicies(prev => {
      const newRolePerms = ALL_MODULES.reduce((acc, module) => {
        acc[module] = [];
        return acc;
      }, {} as any);

      return {
        [trimmed]: newRolePerms,
        ...prev
      };
    });
    setNewRoleName('');
    setExpandedRole(trimmed);
  };

  useEffect(() => {
    // Inicialmente cargar de caché local para evitar pantalla en blanco si hay conexión lenta
    const cached = getStoredRolePermissions();
    if (Object.keys(cached).length > 0) {
      setPolicies(cached);
    } else {
      setPolicies(DEFAULT_ROLE_PERMISSIONS);
    }
    
    // Y luego sincronizar inmediatamente con Supabase DB
    fetchFromSupabase();
  }, []);

  const fetchFromSupabase = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('role_permissions').select('*');
      
      if (error) {
        console.error('Error fetching role_permissions from Supabase:', error);
        setErrorMessage('No se pudieron cargar los permisos de la base de datos.');
        return;
      }
      
      if (data && data.length > 0) {
        const mergedPolicies: RolePolicies = { ...getStoredRolePermissions() };
        
        // Asume tabla: { id?, role: string, permissions: JSON | PermissionsMap }
        data.forEach(row => {
          if (row.role && row.permissions) {
             mergedPolicies[row.role] = {
               ...mergedPolicies[row.role],
               ...row.permissions
             };
          }
        });
        
        setPolicies(mergedPolicies);
        saveLocalPermissions(mergedPolicies);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = (role: string, module: AppModule, action: Action) => {
    setPolicies(prev => {
      const newPolicies = { ...prev };
      const rolePerms = newPolicies[role] || {};
      const modulePerms = rolePerms[module] || [];

      let newModulePerms: Action[];
      if (modulePerms.includes(action)) {
        newModulePerms = modulePerms.filter(a => a !== action);
      } else {
        newModulePerms = [...modulePerms, action];
      }

      return {
        ...newPolicies,
        [role]: {
          ...rolePerms,
          [module]: newModulePerms
        }
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMessage('');
    
    try {
      // Guardar localmente primero
      saveLocalPermissions(policies);
      
      // Luego actualizar o insertar en la base de datos rol por rol
      const rolesToSave = Object.keys(policies);
      for (const role of rolesToSave) {
        const permObj = policies[role];
        
        // Revisar si existe
        const { data: existingRow, error: selectError } = await supabase.from('role_permissions').select('id').eq('role', role).maybeSingle();
        
        if (selectError) {
          throw selectError;
        }
        
        if (existingRow?.id) {
          // Update
          const { error: updateError } = await supabase.from('role_permissions').update({ permissions: permObj }).eq('id', existingRow.id);
          if (updateError) throw updateError;
        } else {
          // Insert
          const { error: insertError } = await supabase.from('role_permissions').insert([{ role, permissions: permObj }]);
          if (insertError) throw insertError;
        }
      }
      
      setSuccessMessage('Permisos sincronizados globalmente y activos.');
      setTimeout(() => setSuccessMessage(''), 5000);
      
      // Emitir evento para que la UI de permisos detecte el cambio en toda la app de forma reactiva
      window.dispatchEvent(new Event('permissionsUpdated'));
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error guardando permisos en Supabase.');
    } finally {
      setSaving(false);
    }
  };

  if (Object.keys(policies).length === 0) return null;

  return (
    <div className="mt-8">
      <div className="flex items-center justify-end mb-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
        >
          {saving ? 'Guardando...' : (
            <>
              <Save className="-ml-1 mr-2 h-4 w-4" />
              Guardar Permisos
            </>
          )}
        </button>
      </div>

      {successMessage && (
        <div className="mb-4 bg-green-50 border border-green-200 p-4 rounded-md flex items-center">
          <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
          <p className="text-sm text-green-700">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 bg-red-50 border border-red-200 p-4 rounded-md flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
          <p className="text-sm text-red-700">{errorMessage}</p>
        </div>
      )}

      {loading && Object.keys(policies).length === 0 ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      ) : (
      <>
        <div className="mb-4 flex items-center gap-2">
          <input
            type="text"
            className="block w-full max-w-xs px-3 py-2 border border-muted rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            placeholder="Nombre del nuevo rol..."
            value={newRoleName}
            onChange={e => setNewRoleName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddRole()}
          />
          <button
            onClick={handleAddRole}
            className="inline-flex items-center px-4 py-2 border border-muted text-sm font-medium rounded-md shadow-sm text-text-main bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            disabled={!newRoleName.trim()}
          >
            Agregar Rol
          </button>
        </div>
      {/* Lista de roles como acordeón para no saturar la vista */}
      <div className="space-y-4">
        {Object.keys(policies).map((role) => (
          <div key={role} className="border border-muted/30 rounded-lg overflow-hidden bg-white">
            <button
              onClick={() => setExpandedRole(expandedRole === role ? null : role)}
              className="w-full flex items-center justify-between p-4 bg-background hover:bg-muted/10 transition-colors text-left"
            >
              <span className="font-semibold text-text-main capitalize">Rol: {role}</span>
              <span className="text-sm text-secondary">
                {expandedRole === role ? 'Ocultar detalles' : 'Configurar permisos'}
              </span>
            </button>
            
            {expandedRole === role && (
              <div className="p-4 border-t border-muted/30">
                <div className="flex flex-col gap-4">
                  {ALL_MODULES.map(module => {
                    const modulePerms = policies[role]?.[module] || [];
                    const config = MODULE_CONFIG[module];
                    if (!config) return null;
                    
                    return (
                      <div key={module} className="border border-muted/20 rounded-md p-4 bg-slate-50/50">
                        <div className="font-medium text-text-main mb-3">{config.label}</div>
                        <div className="flex flex-wrap gap-4">
                          {config.actions.map(({ id: actionId, label: actionLabel }) => {
                            const isChecked = modulePerms.includes(actionId);
                            // Regla especial: Admin siempre debería tener acceso a Settings, se podría bloquear el checkbox
                            const isDisabled = role === 'admin' && module === 'settings' && actionId === 'view';

                            return (
                              <label key={actionId} className="flex items-center space-x-2 text-sm text-secondary cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={isDisabled}
                                  onChange={() => handleTogglePermission(role, module, actionId)}
                                  className="h-4 w-4 text-primary focus:ring-primary border-muted rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                                <span>{actionLabel}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      </>
      )}
      
      <div className="mt-4 bg-blue-50 border-l-4 border-blue-400 p-4 rounded-md flex items-start">
        <AlertCircle className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700">
          Nota: Los permisos asignados aquí se guardan de forma centralizada en la base de datos (Supabase) bajo la tabla <strong>role_permissions</strong>.
        </p>
      </div>
    </div>
  );
}
