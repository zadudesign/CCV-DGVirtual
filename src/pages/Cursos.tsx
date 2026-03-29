import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Loader2, Search, X, ExternalLink, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Curso, User } from '../types';

import { Link } from 'react-router-dom';

export default function Cursos() {
  const { user } = useAuth();
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewClickup, setPreviewClickup] = useState<string | null>(null);

  // Form state
  const [nombre, setNombre] = useState('');
  const [programa, setPrograma] = useState('');
  const [docenteId, setDocenteId] = useState('');
  const [evaluadorId, setEvaluadorId] = useState('');
  const [tipoSolicitud, setTipoSolicitud] = useState<'Creación Completa' | 'Actualización'>('Creación Completa');
  const [semestre, setSemestre] = useState<number>(1);
  const [fechaInicio, setFechaInicio] = useState('');
  const [tipoContrato, setTipoContrato] = useState<'Carga Académica - 5 Horas Semanales' | 'Prestación de Servicios - 1 o 2 Meses'>('Carga Académica - 5 Horas Semanales');
  const [clickupUrl, setClickupUrl] = useState('');

  // Options
  const [docentes, setDocentes] = useState<User[]>([]);
  const [evaluadores, setEvaluadores] = useState<User[]>([]);
  const [programas, setProgramas] = useState<{id: string, nombre: string, facultad?: string}[]>([]);

  useEffect(() => {
    fetchCursos();
    if (user?.role === 'admin' || user?.role === 'decano' || user?.role === 'coordinador') {
      fetchOptions();
    }
  }, [user]);

  const fetchCursos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cursos')
        .select(`
          *,
          docente:profiles!docente_id(name, email),
          evaluador:profiles!evaluador_id(name, email),
          creador:profiles!creador_id(name, email)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCursos(data as Curso[]);
    } catch (err) {
      console.error('Error fetching cursos:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      // Fetch posibles docentes (pueden ser docentes, coordinadores o decanos)
      const { data: dData } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['docente', 'coordinador', 'decano'])
        .order('name');
      if (dData) setDocentes(dData as User[]);

      // Fetch posibles evaluadores (pueden ser evaluadores, docentes, coordinadores o decanos)
      const { data: eData } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['evaluador', 'docente', 'coordinador', 'decano'])
        .order('name');
      if (eData) setEvaluadores(eData as User[]);

      // Fetch programas
      let pData = [];
      if (user?.role === 'decano' && user.facultad) {
        // Fetch the facultad ID first
        const { data: fData } = await supabase
          .from('facultades')
          .select('id')
          .eq('nombre', user.facultad)
          .single();
          
        if (fData) {
          const { data } = await supabase
            .from('programas')
            .select('id, nombre')
            .eq('facultad_id', fData.id);
          pData = data || [];
        }
      } else {
        const { data } = await supabase.from('programas').select('id, nombre, facultades(nombre)');
        pData = data?.map((p: any) => ({
          id: p.id,
          nombre: p.nombre,
          facultad: p.facultades?.nombre
        })) || [];
      }
      
      setProgramas(pData);
      
      if (user?.role === 'coordinador' && user.programa) {
        setPrograma(user.programa);
      }
    } catch (err) {
      console.error('Error fetching options:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let cursoFacultad = user?.facultad || 'General';
      if (user?.role === 'admin' && programa) {
        const selectedProg = programas.find(p => p.nombre === programa);
        if (selectedProg && selectedProg.facultad) {
          cursoFacultad = selectedProg.facultad;
        }
      }

      const { error } = await supabase
        .from('cursos')
        .insert([{
          nombre,
          facultad: cursoFacultad,
          programa: programa || user?.programa || 'General',
          docente_id: docenteId,
          evaluador_id: evaluadorId || null,
          creador_id: user?.id,
          estado: 'Planificación',
          progreso: 0,
          tipo_solicitud: tipoSolicitud,
          semestre: Number(semestre),
          fecha_inicio: fechaInicio,
          tipo_contrato: tipoContrato,
          clickup_url: clickupUrl || null
        }]);

      if (error) throw error;
      
      setShowModal(false);
      setNombre('');
      setDocenteId('');
      setEvaluadorId('');
      setTipoSolicitud('Creación Completa');
      setSemestre(1);
      setFechaInicio('');
      setTipoContrato('Carga Académica - 5 Horas Semanales');
      setClickupUrl('');
      fetchCursos();
    } catch (err) {
      console.error('Error creating curso:', err);
      alert('Error al crear el curso');
    } finally {
      setSubmitting(false);
    }
  };

  const canCreate = user?.role === 'admin' || user?.role === 'decano' || user?.role === 'coordinador';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Cursos</h1>
          <p className="mt-1 text-sm text-slate-500">
            Solicita y administra los cursos virtuales de la plataforma.
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <Plus className="h-5 w-5 mr-2" />
            {user?.role === 'admin' ? 'Cargar Curso' : 'Solicitar Curso'}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Curso</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Programa</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Docente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Progreso</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-600" />
                  </td>
                </tr>
              ) : cursos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-slate-500">
                    No hay cursos registrados.
                  </td>
                </tr>
              ) : (
                cursos.map((curso) => (
                  <tr key={curso.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link to={`/cursos/${curso.id}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-900">{curso.nombre}</Link>
                      {curso.clickup_url && (
                        <div className="flex items-center space-x-3 mt-1">
                          <button 
                            onClick={() => setPreviewClickup(curso.clickup_url!)}
                            className="inline-flex items-center text-xs text-indigo-600 hover:text-indigo-800"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Previsualizar
                          </button>
                          <a 
                            href={curso.clickup_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-xs text-slate-500 hover:text-slate-700"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Abrir
                          </a>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {curso.programa}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">{curso.docente?.name || 'Sin asignar'}</div>
                      <div className="text-xs text-slate-500">{curso.docente?.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        curso.estado === 'Publicado' ? 'bg-green-100 text-green-800' :
                        curso.estado === 'Revisión' ? 'bg-amber-100 text-amber-800' :
                        curso.estado === 'En Desarrollo' ? 'bg-blue-100 text-blue-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {curso.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-full bg-slate-200 rounded-full h-2.5 mr-2 max-w-[100px]">
                          <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${curso.progreso}%` }}></div>
                        </div>
                        <span className="text-xs text-slate-500">{curso.progreso}%</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-slate-900 bg-opacity-75" onClick={() => setShowModal(false)} />

            <div className="relative inline-block w-full max-w-md p-6 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-medium leading-6 text-slate-900">
                  {user?.role === 'admin' ? 'Cargar Nuevo Curso' : 'Solicitar Nuevo Curso'}
                </h3>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-500">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Tipo de Solicitud</label>
                  <select
                    required
                    value={tipoSolicitud}
                    onChange={(e) => setTipoSolicitud(e.target.value as any)}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="Creación Completa">Creación Completa</option>
                    <option value="Actualización">Actualización</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Nombre del Curso</label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                    placeholder="Ej. Introducción a la Programación"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Semestre</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={semestre}
                    onChange={(e) => setSemestre(parseInt(e.target.value))}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                {user?.role !== 'coordinador' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Programa</label>
                    <select
                      required
                      value={programa}
                      onChange={(e) => setPrograma(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="">Seleccione un programa</option>
                      {programas.map((p) => (
                        <option key={p.id} value={p.nombre}>{p.nombre}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700">Docente Asignado</label>
                  <select
                    required
                    value={docenteId}
                    onChange={(e) => setDocenteId(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Seleccione un docente</option>
                    {docentes.map((d) => (
                      <option key={d.id} value={d.id}>{d.name || d.email}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Fecha de Inicio</label>
                  <input
                    type="date"
                    required
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Tipo de Contrato</label>
                  <select
                    required
                    value={tipoContrato}
                    onChange={(e) => setTipoContrato(e.target.value as any)}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="Carga Académica - 5 Horas Semanales">Carga Académica - 5 Horas Semanales</option>
                    <option value="Prestación de Servicios - 1 o 2 Meses">Prestación de Servicios - 1 o 2 Meses</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Par Evaluador (Opcional)</label>
                  <select
                    value={evaluadorId}
                    onChange={(e) => setEvaluadorId(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Seleccione un evaluador</option>
                    {evaluadores.map((e) => (
                      <option key={e.id} value={e.id}>{e.name || e.email}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">URL de Tareas en ClickUp (Opcional)</label>
                  <input
                    type="url"
                    value={clickupUrl}
                    onChange={(e) => setClickupUrl(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                    placeholder="https://app.clickup.com/t/..."
                  />
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {user?.role === 'admin' ? 'Cargar Curso' : 'Solicitar Curso'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Preview Modal */}
      {previewClickup && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center">
          <div className="fixed inset-0 transition-opacity bg-slate-900 bg-opacity-75" onClick={() => setPreviewClickup(null)} />
          
          <div className="relative w-full max-w-6xl h-[85vh] m-4 bg-white shadow-2xl rounded-2xl flex flex-col overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-lg font-medium text-slate-900 flex items-center">
                <Eye className="h-5 w-5 mr-2 text-indigo-600" />
                Previsualización de ClickUp
              </h3>
              <div className="flex items-center space-x-4">
                <a 
                  href={previewClickup} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Abrir en nueva pestaña
                </a>
                <button onClick={() => setPreviewClickup(null)} className="text-slate-400 hover:text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-full p-1 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 w-full bg-slate-100 p-0">
              {/* Note: ClickUp standard URLs (app.clickup.com) block iframes. 
                  Users must use the "Public Sharing" embed link (sharing.clickup.com) for this to work. */}
              <iframe 
                src={previewClickup} 
                className="w-full h-full border-0"
                title="ClickUp Preview"
                allow="clipboard-write"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
