import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { FileSignature, Loader2, Save, CheckCircle2, UserCircle, Shield } from 'lucide-react';
import { RolePermissionsEditor } from '../components/RolePermissionsEditor';
import { hasPermission } from '../lib/permissions';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function Configuracion() {
  const { user, refreshSession } = useAuth();
  const queryClient = useQueryClient();
  
  const canViewPerfil = hasPermission(user, 'settings', 'tab_perfil');
  const canViewPermisos = hasPermission(user, 'settings', 'tab_permisos');
  const defaultTab = canViewPerfil ? 'personal' : canViewPermisos ? 'permisos' : 'personal';

  const [firmaDigital, setFirmaDigital] = useState<string>('');
  const [photoURL, setPhotoURL] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'personal' | 'permisos'>(defaultTab);

  const { isLoading: loading } = useQuery({
    queryKey: ['profile-config', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('firma_digital, photoURL')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      if (data) {
        if (data.firma_digital) setFirmaDigital(data.firma_digital);
        if (data.photoURL) setPhotoURL(data.photoURL);
      }
      return data;
    },
    enabled: !!user
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit
        setError('La imagen de perfil es demasiado grande. El tamaño máximo es 1MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoURL(reader.result as string);
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit
        setError('La imagen es demasiado grande. El tamaño máximo es 1MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFirmaDigital(reader.result as string);
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ firma_digital: firmaDigital, photoURL: photoURL })
        .eq('id', user.id);

      if (error) throw error;

      await refreshSession();
      queryClient.invalidateQueries({ queryKey: ['profile-config', user.id] });
      setSuccessMessage('Perfil actualizado correctamente.');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      console.error('Error updating signature:', err);
      setError('Hubo un error al guardar la firma digital o foto de perfil.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex border-b border-muted/30 -mb-px relative top-[1px] mb-6">
        {canViewPerfil && (
          <button
            onClick={() => setActiveTab('personal')}
            className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center ${
              activeTab === 'personal'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-secondary hover:text-text-main hover:bg-slate-50'
            }`}
          >
            <UserCircle className={`mr-2 h-4 w-4 ${activeTab === 'personal' ? 'text-primary' : 'text-slate-400'}`} />
            Información Personal
          </button>
        )}
        {canViewPermisos && (
          <button
            onClick={() => setActiveTab('permisos')}
            className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center ${
              activeTab === 'permisos'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-secondary hover:text-text-main hover:bg-slate-50'
            }`}
          >
            <Shield className={`mr-2 h-4 w-4 ${activeTab === 'permisos' ? 'text-primary' : 'text-slate-400'}`} />
            Gestión de Permisos
          </button>
        )}
      </div>

      {activeTab === 'personal' && canViewPerfil && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6 space-y-6">
          
          {/* Información del Usuario (Solo lectura) */}
          <div>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-text-main">Nombre Completo</label>
                <div className="mt-1 p-2 bg-background border border-muted/30 rounded-md text-text-main">
                  {user?.name}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main">Correo Electrónico</label>
                <div className="mt-1 p-2 bg-background border border-muted/30 rounded-md text-text-main">
                  {user?.email}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-main">Rol</label>
                <div className="mt-1 p-2 bg-background border border-muted/30 rounded-md text-text-main capitalize">
                  {['Soporte', 'Multimedia', 'Diseño', 'Pedagogía', 'team'].includes(user?.role || '') ? `Miembro del Equipo (${user?.role === 'team' ? user?.team_area : user?.role})` : user?.role}
                </div>
              </div>
            </div>
          </div>

          <hr className="border-muted/30" />

          {/* Foto de Perfil */}
          <div>
            <h3 className="text-lg font-medium text-text-main mb-4">Foto de Perfil</h3>
            <p className="text-sm text-secondary mb-4">
              Sube una imagen para tu perfil (PNG o JPG, máximo 1MB).
            </p>

            {error && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {successMessage && (
              <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4 rounded-md">
                <div className="flex items-center">
                  <CheckCircle2 className="h-5 w-5 text-green-400 mr-2" />
                  <p className="text-sm text-green-700">{successMessage}</p>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-6">
              <div className="flex-shrink-0 h-24 w-24 rounded-full bg-accent flex items-center justify-center text-primary text-4xl font-bold shadow-md overflow-hidden">
                {photoURL ? (
                  <img src={photoURL} alt="Perfil" className="h-full w-full object-cover" />
                ) : (
                  user?.name?.charAt(0) || <UserCircle className="h-12 w-12" />
                )}
              </div>
              <div className="flex-1">
                <div className="relative rounded-md shadow-sm w-full max-w-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserCircle className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="file"
                    accept="image/png, image/jpeg"
                    onChange={handlePhotoChange}
                    className="focus:ring-primary focus:border-primary block w-full pl-10 sm:text-sm border-muted rounded-md py-2 border bg-white file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary-hover hover:file:bg-primary/20"
                  />
                </div>
              </div>
            </div>
          </div>

          <hr className="border-muted/30" />

          {/* Firma Digital */}
          {!['Soporte', 'Multimedia', 'Diseño', 'Pedagogía', 'team'].includes(user?.role || '') && (
            <div>
              <h3 className="text-lg font-medium text-text-main mb-4">Firma Digital</h3>
              <p className="text-sm text-secondary mb-4">
                Sube una imagen con tu firma digital (PNG, JPG o SVG). Esta firma se utilizará para firmar documentos oficiales dentro de la plataforma.
              </p>

              <div className="sm:col-span-2 max-w-xl">
                <div className="mt-1 flex items-center">
                  <div className="relative rounded-md shadow-sm w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FileSignature className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="file"
                      id="firma_digital"
                      name="firma_digital"
                      accept="image/png, image/jpeg, image/svg+xml"
                      onChange={handleFileChange}
                      className="focus:ring-primary focus:border-primary block w-full pl-10 sm:text-sm border-muted rounded-md py-2 border bg-white file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary-hover hover:file:bg-primary/20"
                    />
                  </div>
                </div>
                
                {firmaDigital && (
                  <div className="mt-6">
                    <p className="text-sm font-medium text-text-main mb-2">Vista previa de tu firma actual:</p>
                    <div className="border border-muted/30 rounded-md p-4 bg-background inline-block">
                      <img src={firmaDigital} alt="Firma Digital" className="h-20 object-contain" />
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  <button
                    onClick={handleSave}
                    disabled={saving || !firmaDigital}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="-ml-1 mr-2 h-4 w-4" />
                        Guardar Firma
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Editor de permisos de roles */}
      {activeTab === 'permisos' && canViewPermisos && (
        <div className="bg-white shadow rounded-lg overflow-hidden p-6">
          <RolePermissionsEditor />
        </div>
      )}
    </div>
  );
}
