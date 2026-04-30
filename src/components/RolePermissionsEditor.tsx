import React, { useState, useEffect } from 'react';
import { Shield, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { getRolePermissions, saveRolePermissions, RolePolicies, Action, AppModule } from '../lib/permissions';

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
  const [successMessage, setSuccessMessage] = useState('');
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  useEffect(() => {
    // Cargar permisos desde localStorage
    setPolicies(getRolePermissions());
  }, []);

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

  const handleSave = () => {
    setSaving(true);
    try {
      saveRolePermissions(policies);
      setSuccessMessage('Permisos actualizados correctamente. Los cambios ya están activos.');
      setTimeout(() => setSuccessMessage(''), 5000);
      
      // Emitir evento para que otros componentes que dependan de permisos se enteren (opcional, 
      // normalmente basta con recargar la página o navegar)
      window.dispatchEvent(new Event('permissionsUpdated'));
    } catch (err) {
      console.error(err);
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
          <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
          <p className="text-sm text-green-700">{successMessage}</p>
        </div>
      )}

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
                              {module === 'settings' ? 'configuración' : module}
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
      
      <div className="mt-4 bg-blue-50 border-l-4 border-blue-400 p-4 rounded-md flex items-start">
        <AlertCircle className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700">
          Nota: Los cambios realizados aquí se almacenan localmente y aplican inmediatamente. Para implementar estos permisos a nivel global y persistente (para todos los usuarios), requerirá configurar una tabla de permisos en Supabase a futuro.
        </p>
      </div>
    </div>
  );
}
