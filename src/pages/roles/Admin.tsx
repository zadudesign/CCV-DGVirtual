import React, { useState } from 'react';
import { UserPlus, Shield, Building2, GraduationCap, Mail, CreditCard, CheckCircle2 } from 'lucide-react';

export default function AdminDashboard() {
  const [formData, setFormData] = useState({
    role: 'decano',
    nombre: '',
    correo: '',
    documento: '',
    facultad: '',
    programa: ''
  });
  const [successMessage, setSuccessMessage] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      // Si cambia a decano, limpiamos el programa
      ...(name === 'role' && value === 'decano' ? { programa: '' } : {})
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.correo,
          password: formData.documento, // Documento como contraseña
          role: formData.role,
          name: formData.nombre,
          documento: formData.documento,
          facultad: formData.facultad,
          programa: formData.programa
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear el usuario');
      }
      
      setSuccessMessage(`¡${formData.role === 'decano' ? 'Decano' : 'Coordinador'} registrado con éxito!`);
      
      // Limpiamos el formulario
      setFormData({
        role: 'decano',
        nombre: '',
        correo: '',
        documento: '',
        facultad: '',
        programa: ''
      });

      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Panel de Administración</h1>
        <p className="mt-1 text-sm text-slate-500">
          Inscripción y gestión de Decanos y Coordinadores de la plataforma CCV.
        </p>
      </div>

      {successMessage && (
        <div className="rounded-md bg-green-50 p-4 border border-green-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircle2 className="h-5 w-5 text-green-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-slate-200 bg-slate-50">
          <h3 className="text-lg leading-6 font-medium text-slate-900 flex items-center">
            <UserPlus className="mr-2 h-5 w-5 text-indigo-600" />
            Inscribir Nuevo Usuario
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Complete los datos para dar acceso a un nuevo Decano o Coordinador.
          </p>
        </div>
        
        <div className="px-4 py-5 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              
              {/* Selección de Rol */}
              <div className="sm:col-span-2">
                <label htmlFor="role" className="block text-sm font-medium text-slate-700">
                  Rol a inscribir
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Shield className="h-5 w-5 text-slate-400" />
                  </div>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-md py-2.5 border bg-white"
                  >
                    <option value="decano">Decano</option>
                    <option value="coordinador">Coordinador</option>
                  </select>
                </div>
              </div>

              {/* Nombre Completo */}
              <div className="sm:col-span-2">
                <label htmlFor="nombre" className="block text-sm font-medium text-slate-700">
                  Nombre Completo
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="nombre"
                    id="nombre"
                    required
                    value={formData.nombre}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-slate-300 rounded-md py-2 px-3 border"
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
              </div>

              {/* Correo Institucional */}
              <div>
                <label htmlFor="correo" className="block text-sm font-medium text-slate-700">
                  Correo Institucional (Usuario)
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    name="correo"
                    id="correo"
                    required
                    value={formData.correo}
                    onChange={handleChange}
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-md py-2 border"
                    placeholder="juan.perez@universidad.edu"
                  />
                </div>
              </div>

              {/* Número de Documento */}
              <div>
                <label htmlFor="documento" className="block text-sm font-medium text-slate-700">
                  Número de Documento (Contraseña)
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CreditCard className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    name="documento"
                    id="documento"
                    required
                    value={formData.documento}
                    onChange={handleChange}
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-md py-2 border"
                    placeholder="Ej. 1020304050"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">Este número será usado como contraseña inicial.</p>
              </div>

              {/* Facultad */}
              <div className={formData.role === 'decano' ? 'sm:col-span-2' : 'sm:col-span-1'}>
                <label htmlFor="facultad" className="block text-sm font-medium text-slate-700">
                  Facultad
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building2 className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    name="facultad"
                    id="facultad"
                    required
                    value={formData.facultad}
                    onChange={handleChange}
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-md py-2 border"
                    placeholder="Ej. Ingeniería"
                  />
                </div>
              </div>

              {/* Programa (Solo Coordinador) */}
              {formData.role === 'coordinador' && (
                <div className="sm:col-span-1">
                  <label htmlFor="programa" className="block text-sm font-medium text-slate-700">
                    Programa
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <GraduationCap className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      name="programa"
                      id="programa"
                      required
                      value={formData.programa}
                      onChange={handleChange}
                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-md py-2 border"
                      placeholder="Ej. Ingeniería de Sistemas"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="pt-5 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setFormData({ role: 'decano', nombre: '', correo: '', documento: '', facultad: '', programa: '' })}
                className="bg-white py-2 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-3"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Inscribiendo...' : `Inscribir ${formData.role === 'decano' ? 'Decano' : 'Coordinador'}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
