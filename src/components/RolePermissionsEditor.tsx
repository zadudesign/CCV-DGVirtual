import React, { useState, useEffect } from 'react';
import { Shield, Save, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { getStoredRolePermissions, saveLocalPermissions, RolePolicies, Action, AppModule, DEFAULT_ROLE_PERMISSIONS } from '../lib/permissions';
import { supabase } from '../lib/supabase';

const ALL_MODULES: AppModule[] = [
  'courses',
  'documents',
  'users',
  'reports',
  'settings',
  'deliveries',
  'notifications'
];

const ALL_ACTIONS: Action[] = ['view', 'create', 'edit', 'delete'];

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

    setPolicies(prev => ({
      [trimmed]: {
        courses: [],
        documents: [],
        users: [],
        reports: [],
        settings: [],
        deliveries: [],
        notifications: []
      },
      ...prev
    }));
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
        const { data: existingRow } = await supabase.from('role_permissions').select('id').eq('role', role).maybeSingle();
        
        if (existingRow?.id) {
          // Update
          await supabase.from('role_permissions').update({ permissions: permObj }).eq('id', existingRow.id);
        } else {
          // Insert
          await supabase.from('role_permissions').insert([{ role, permissions: permObj }]);
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-text-main flex items-center">
            <Shield className="h-5 w-5 mr-2 text-primary" />
            Gestión de Permisos por Rol
          </h3>
          <p className="text-sm text-secondary">
            Configura qué acciones (ver, crear, editar, eliminar) tiene permitidas cada rol en los distintos módulos del sistema.
          </p>
        </div>
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
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-muted/30 border border-muted/30 rounded-md">
                    <thead className="bg-background">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                          Módulo
                        </th>
                        {ALL_ACTIONS.map(action => (
                          <th key={action} scope="col" className="px-4 py-3 text-center text-xs font-medium text-secondary uppercase tracking-wider">
                            {action === 'view' ? 'Ver' : 
                             action === 'create' ? 'Crear' : 
                             action === 'edit' ? 'Editar' : 'Eliminar'}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-muted/30">
                      {ALL_MODULES.map(module => {
                        const modulePerms = policies[role][module] || [];
                        return (
                          <tr key={module} className="hover:bg-background/50">
                            <td className="px-4 py-3 text-sm font-medium text-text-main capitalize">
                              {module === 'settings' ? 'configuración' : module === 'deliveries' ? 'Entregables (deliveries)' : module}
                            </td>
                            {ALL_ACTIONS.map(action => {
                              const isChecked = modulePerms.includes(action);
                              // Regla especial: Admin siempre debería tener acceso a Settings, se podría bloquear el checkbox
                              const isDisabled = role === 'admin' && module === 'settings' && action === 'view';

                              return (
                                <td key={action} className="px-4 py-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    disabled={isDisabled}
                                    onChange={() => handleTogglePermission(role, module, action)}
                                    className="h-4 w-4 text-primary focus:ring-primary border-muted rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={isDisabled ? 'Permiso obligatorio para admin' : `Permitir ${action} en ${module}`}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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
