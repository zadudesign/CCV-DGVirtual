import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { FileSignature, Loader2, Save, CheckCircle2 } from 'lucide-react';

export default function Configuracion() {
  const { user } = useAuth();
  const [firmaDigital, setFirmaDigital] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('firma_digital')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        if (data && data.firma_digital) {
          setFirmaDigital(data.firma_digital);
        }
      } catch (err: any) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

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
        .update({ firma_digital: firmaDigital })
        .eq('id', user.id);

      if (error) throw error;

      setSuccessMessage('Firma digital actualizada correctamente.');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      console.error('Error updating signature:', err);
      setError('Hubo un error al guardar la firma digital.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configuración de Perfil</h1>
        <p className="mt-1 text-sm text-slate-500">
          Gestiona tu información personal y firma digital.
        </p>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6 space-y-6">
          
          {/* Información del Usuario (Solo lectura) */}
          <div>
            <h3 className="text-lg font-medium text-slate-900 mb-4">Información Personal</h3>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Nombre Completo</label>
                <div className="mt-1 p-2 bg-slate-50 border border-slate-200 rounded-md text-slate-700">
                  {user?.name}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Correo Electrónico</label>
                <div className="mt-1 p-2 bg-slate-50 border border-slate-200 rounded-md text-slate-700">
                  {user?.email}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Rol</label>
                <div className="mt-1 p-2 bg-slate-50 border border-slate-200 rounded-md text-slate-700 capitalize">
                  {['Soporte', 'Multimedia', 'Diseño', 'Pedagogía', 'team'].includes(user?.role || '') ? `Miembro del Equipo (${user?.role === 'team' ? user?.team_area : user?.role})` : user?.role}
                </div>
              </div>
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Firma Digital */}
          {!['Soporte', 'Multimedia', 'Diseño', 'Pedagogía', 'team'].includes(user?.role || '') && (
            <div>
              <h3 className="text-lg font-medium text-slate-900 mb-4">Firma Digital</h3>
              <p className="text-sm text-slate-500 mb-4">
                Sube una imagen con tu firma digital (PNG, JPG o SVG). Esta firma se utilizará para firmar documentos oficiales dentro de la plataforma.
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
                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-md py-2 border bg-white file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                  </div>
                </div>
                
                {firmaDigital && (
                  <div className="mt-6">
                    <p className="text-sm font-medium text-slate-700 mb-2">Vista previa de tu firma actual:</p>
                    <div className="border border-slate-200 rounded-md p-4 bg-slate-50 inline-block">
                      <img src={firmaDigital} alt="Firma Digital" className="h-20 object-contain" />
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  <button
                    onClick={handleSave}
                    disabled={saving || !firmaDigital}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  );
}
