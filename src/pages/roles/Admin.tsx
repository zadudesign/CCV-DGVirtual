import React, { useState, useEffect } from 'react';
import { UserPlus, Shield, Building2, GraduationCap, Mail, CreditCard, CheckCircle2, Plus, Loader2, Phone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Facultad, Programa } from '../../types';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'usuarios' | 'facultades'>('usuarios');

  // Estado para Usuarios
  const [formData, setFormData] = useState({
    role: 'decano',
    nombre: '',
    correo: '',
    documento: '',
    telefono: '',
    facultad: '',
    programa: ''
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Estado para Facultades y Programas
  const [facultades, setFacultades] = useState<Facultad[]>([]);
  const [programas, setProgramas] = useState<Programa[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  const [newFacultadName, setNewFacultadName] = useState('');
  const [newProgramaName, setNewProgramaName] = useState('');
  const [selectedFacultadForPrograma, setSelectedFacultadForPrograma] = useState('');
  
  const [facultadSuccess, setFacultadSuccess] = useState('');
  const [facultadError, setFacultadError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoadingData(true);
      const [facultadesRes, programasRes] = await Promise.all([
        supabase.from('facultades').select('*').order('nombre'),
        supabase.from('programas').select('*').order('nombre')
      ]);

      if (facultadesRes.error) throw facultadesRes.error;
      if (programasRes.error) throw programasRes.error;

      setFacultades(facultadesRes.data || []);
      setProgramas(programasRes.data || []);
      
      // Select first facultad by default if available
      if (facultadesRes.data && facultadesRes.data.length > 0) {
        setSelectedFacultadForPrograma(facultadesRes.data[0].id);
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
      // No mostramos error bloqueante, solo logueamos
    } finally {
      setLoadingData(false);
    }
  };

  const handleAddFacultad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFacultadName.trim()) return;
    
    setFacultadError('');
    setFacultadSuccess('');
    
    try {
      const { data, error } = await supabase
        .from('facultades')
        .insert([{ nombre: newFacultadName.trim() }])
        .select()
        .single();

      if (error) throw error;

      setFacultades(prev => [...prev, data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setNewFacultadName('');
      setFacultadSuccess('Facultad agregada con éxito');
      
      if (!selectedFacultadForPrograma) {
        setSelectedFacultadForPrograma(data.id);
      }
      
      setTimeout(() => setFacultadSuccess(''), 3000);
    } catch (err: any) {
      setFacultadError(err.message || 'Error al agregar facultad');
    }
  };

  const handleAddPrograma = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProgramaName.trim() || !selectedFacultadForPrograma) return;
    
    setFacultadError('');
    setFacultadSuccess('');
    
    try {
      const { data, error } = await supabase
        .from('programas')
        .insert([{ 
          nombre: newProgramaName.trim(),
          facultad_id: selectedFacultadForPrograma
        }])
        .select()
        .single();

      if (error) throw error;

      setProgramas(prev => [...prev, data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setNewProgramaName('');
      setFacultadSuccess('Programa agregado con éxito');
      setTimeout(() => setFacultadSuccess(''), 3000);
    } catch (err: any) {
      setFacultadError(err.message || 'Error al agregar programa');
    }
  };

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
          password: `${formData.documento.slice(-4)}*CCV`, // Últimos 4 dígitos + *CCV
          role: formData.role,
          name: formData.nombre,
          documento: formData.documento,
          telefono: formData.telefono,
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
        telefono: '',
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

  // Filtrar programas basados en la facultad seleccionada en el formulario de usuario
  const selectedFacultadObj = facultades.find(f => f.nombre === formData.facultad);
  const filteredProgramas = programas.filter(p => p.facultad_id === selectedFacultadObj?.id);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Panel de Administración</h1>
        <p className="mt-1 text-sm text-slate-500">
          Gestión de usuarios, facultades y programas de la plataforma CCV.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('usuarios')}
            className={`${
              activeTab === 'usuarios'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <UserPlus className="mr-2 h-5 w-5" />
            Inscribir Usuarios
          </button>
          <button
            onClick={() => setActiveTab('facultades')}
            className={`${
              activeTab === 'facultades'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <Building2 className="mr-2 h-5 w-5" />
            Facultades y Programas
          </button>
        </nav>
      </div>

      {activeTab === 'usuarios' && (
        <>
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
                      Correo Institucional
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
                      Número de Documento
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

                  {/* Número de Contacto / Teléfono */}
                  <div>
                    <label htmlFor="telefono" className="block text-sm font-medium text-slate-700">
                      Número de Contacto
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        type="tel"
                        name="telefono"
                        id="telefono"
                        required
                        value={formData.telefono}
                        onChange={handleChange}
                        className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-md py-2 border"
                        placeholder="Ej. 3001234567"
                      />
                    </div>
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
                      {loadingData ? (
                        <div className="pl-10 py-2 text-sm text-slate-500 flex items-center border border-slate-300 rounded-md">
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Cargando...
                        </div>
                      ) : (
                        <select
                          name="facultad"
                          id="facultad"
                          required
                          value={formData.facultad}
                          onChange={handleChange}
                          className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-md py-2.5 border bg-white"
                        >
                          <option value="">Seleccione una facultad</option>
                          {facultades.map(fac => (
                            <option key={fac.id} value={fac.nombre}>{fac.nombre}</option>
                          ))}
                        </select>
                      )}
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
                        {loadingData ? (
                          <div className="pl-10 py-2 text-sm text-slate-500 flex items-center border border-slate-300 rounded-md">
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Cargando...
                          </div>
                        ) : (
                          <select
                            name="programa"
                            id="programa"
                            required
                            value={formData.programa}
                            onChange={handleChange}
                            disabled={!formData.facultad}
                            className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-md py-2.5 border bg-white disabled:bg-slate-100 disabled:text-slate-500"
                          >
                            <option value="">
                              {!formData.facultad ? 'Primero seleccione facultad' : 'Seleccione un programa'}
                            </option>
                            {filteredProgramas.map(prog => (
                              <option key={prog.id} value={prog.nombre}>{prog.nombre}</option>
                            ))}
                          </select>
                        )}
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
        </>
      )}

      {activeTab === 'facultades' && (
        <div className="space-y-6">
          {facultadSuccess && (
            <div className="rounded-md bg-green-50 p-4 border border-green-200">
              <div className="flex">
                <div className="flex-shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-green-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">{facultadSuccess}</p>
                </div>
              </div>
            </div>
          )}

          {facultadError && (
            <div className="rounded-md bg-red-50 p-4 border border-red-200">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{facultadError}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Panel Facultades */}
            <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden flex flex-col">
              <div className="px-4 py-5 sm:px-6 border-b border-slate-200 bg-slate-50">
                <h3 className="text-lg leading-6 font-medium text-slate-900 flex items-center">
                  <Building2 className="mr-2 h-5 w-5 text-indigo-600" />
                  Facultades
                </h3>
              </div>
              <div className="p-4 border-b border-slate-100">
                <form onSubmit={handleAddFacultad} className="flex gap-2">
                  <input
                    type="text"
                    value={newFacultadName}
                    onChange={(e) => setNewFacultadName(e.target.value)}
                    placeholder="Nueva facultad..."
                    className="flex-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-slate-300 rounded-md py-2 px-3 border"
                  />
                  <button
                    type="submit"
                    disabled={!newFacultadName.trim()}
                    className="inline-flex items-center p-2 border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </form>
              </div>
              <div className="flex-1 overflow-y-auto max-h-96 p-4">
                {loadingData ? (
                  <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 text-slate-400 animate-spin" /></div>
                ) : facultades.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No hay facultades registradas.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {facultades.map(fac => (
                      <li key={fac.id} className="py-3 flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-900">{fac.nombre}</span>
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                          {programas.filter(p => p.facultad_id === fac.id).length} programas
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Panel Programas */}
            <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden flex flex-col">
              <div className="px-4 py-5 sm:px-6 border-b border-slate-200 bg-slate-50">
                <h3 className="text-lg leading-6 font-medium text-slate-900 flex items-center">
                  <GraduationCap className="mr-2 h-5 w-5 text-indigo-600" />
                  Programas
                </h3>
              </div>
              <div className="p-4 border-b border-slate-100 space-y-3">
                <select
                  value={selectedFacultadForPrograma}
                  onChange={(e) => setSelectedFacultadForPrograma(e.target.value)}
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-slate-300 rounded-md py-2 px-3 border bg-white"
                >
                  <option value="" disabled>Seleccione una facultad</option>
                  {facultades.map(fac => (
                    <option key={fac.id} value={fac.id}>{fac.nombre}</option>
                  ))}
                </select>
                <form onSubmit={handleAddPrograma} className="flex gap-2">
                  <input
                    type="text"
                    value={newProgramaName}
                    onChange={(e) => setNewProgramaName(e.target.value)}
                    placeholder="Nuevo programa..."
                    className="flex-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-slate-300 rounded-md py-2 px-3 border"
                  />
                  <button
                    type="submit"
                    disabled={!newProgramaName.trim() || !selectedFacultadForPrograma}
                    className="inline-flex items-center p-2 border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </form>
              </div>
              <div className="flex-1 overflow-y-auto max-h-96 p-4">
                {loadingData ? (
                  <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 text-slate-400 animate-spin" /></div>
                ) : programas.filter(p => p.facultad_id === selectedFacultadForPrograma).length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">
                    {selectedFacultadForPrograma ? 'No hay programas en esta facultad.' : 'Seleccione una facultad.'}
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {programas
                      .filter(p => p.facultad_id === selectedFacultadForPrograma)
                      .map(prog => (
                      <li key={prog.id} className="py-3">
                        <span className="text-sm font-medium text-slate-900">{prog.nombre}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
