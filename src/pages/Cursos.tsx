import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Loader2, Search, X, ExternalLink, LayoutDashboard, Calendar } from 'lucide-react';
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
  
  // Form state
  const [nombre, setNombre] = useState('');
  const [programa, setPrograma] = useState('');
  const [docenteId, setDocenteId] = useState('');
  const [evaluadorId, setEvaluadorId] = useState('');
  const [tipoSolicitud, setTipoSolicitud] = useState<'Creación Completa' | 'Actualización' | 'Visita MEN'>('Creación Completa');
  const [semestre, setSemestre] = useState<number>(1);
  const [fechaInicio, setFechaInicio] = useState('');
  const [tipoContrato, setTipoContrato] = useState<'Carga Académica - 5 Horas Semanales' | 'Prestación de Servicios - 1 o 2 Meses'>('Carga Académica - 5 Horas Semanales');
  const [clickupUrl, setClickupUrl] = useState('');
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Filters
  const [filtroSemestre, setFiltroSemestre] = useState<string>('');
  const [filtroPrograma, setFiltroPrograma] = useState<string>('');

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
          progreso_general: 0,
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

  const handleSyncClickUp = async (cursoId: string, listId: string) => {
    try {
      setSyncingId(cursoId);
      const response = await fetch('/api/clickup/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ curso_id: cursoId, list_id: listId })
      });

      if (!response.ok) {
        throw new Error('Error al sincronizar con ClickUp');
      }

      const data = await response.json();
      alert(`Sincronización exitosa: ${data.progreso}% completado (${data.completadas}/${data.total} tareas)`);
      fetchCursos();
    } catch (error) {
      console.error('Error syncing:', error);
      alert('Error al sincronizar con ClickUp. Verifica que el ID de la lista sea correcto y que la API Key esté configurada.');
    } finally {
      setSyncingId(null);
    }
  };

  const semestresUnicos = Array.from(new Set(cursos.map(c => c.semestre?.toString()).filter(Boolean))).sort((a, b) => Number(a) - Number(b));
  const programasUnicos = Array.from(new Set(cursos.map(c => c.programa).filter(Boolean))).sort();

  const cursosFiltrados = cursos.filter(curso => {
    const matchSemestre = filtroSemestre ? curso.semestre?.toString() === filtroSemestre : true;
    const matchPrograma = filtroPrograma ? curso.programa === filtroPrograma : true;
    return matchSemestre && matchPrograma;
  });

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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex-1">
          <label htmlFor="filtroPrograma" className="block text-sm font-medium text-slate-700 mb-1">
            Filtrar por Programa
          </label>
          <select
            id="filtroPrograma"
            value={filtroPrograma}
            onChange={(e) => setFiltroPrograma(e.target.value)}
            className="block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="">Todos los programas</option>
            {programasUnicos.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor="filtroSemestre" className="block text-sm font-medium text-slate-700 mb-1">
            Filtrar por Semestre
          </label>
          <select
            id="filtroSemestre"
            value={filtroSemestre}
            onChange={(e) => setFiltroSemestre(e.target.value)}
            className="block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="">Todos los semestres</option>
            {semestresUnicos.map(s => (
              <option key={s} value={s}>Semestre {s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Curso</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Programa</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Semestre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Docente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Progreso</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-600" />
                  </td>
                </tr>
              ) : cursosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-slate-500">
                    No hay cursos registrados.
                  </td>
                </tr>
              ) : (
                cursosFiltrados.map((curso) => (
                  <tr key={curso.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link 
                        to={`/cursos/${curso.id}`} 
                        className="inline-flex items-center px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md text-sm font-medium transition-colors"
                      >
                        {curso.nombre}
                      </Link>
                      <div className="flex items-center mt-2 pl-1 space-x-3">
                        {curso.clickup_url && (
                          <a 
                            href={curso.clickup_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-xs text-slate-500 hover:text-indigo-600 transition-colors"
                          >
                            <LayoutDashboard className="h-3.5 w-3.5 mr-1.5" />
                            Abrir Tablero ClickUp
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {curso.programa}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {curso.semestre ? `Semestre ${curso.semestre}` : '-'}
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
                      <div className="flex items-center justify-between">
                        <div className="flex items-center flex-1">
                          <div className="w-full bg-slate-200 rounded-full h-2.5 mr-2 max-w-[100px]">
                            <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${curso.progreso_general || 0}%` }}></div>
                          </div>
                          <span className="text-xs text-slate-500">{curso.progreso_general || 0}%</span>
                        </div>
                        {curso.clickup_list_id && (
                          <button
                            onClick={() => handleSyncClickUp(curso.id, curso.clickup_list_id!)}
                            disabled={syncingId === curso.id}
                            className="ml-2 text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                            title="Sincronizar progreso con ClickUp"
                          >
                            <Loader2 className={`h-4 w-4 ${syncingId === curso.id ? 'animate-spin' : 'hidden'}`} />
                            <svg className={`h-4 w-4 ${syncingId === curso.id ? 'hidden' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                        )}
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

            <div className={`relative inline-block w-full ${user?.role === 'admin' ? 'max-w-md' : 'max-w-2xl'} p-6 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl`}>
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-medium leading-6 text-slate-900">
                  {user?.role === 'admin' ? 'Cargar Nuevo Curso' : 'Solicitar Nuevo Curso'}
                </h3>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-500">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {user?.role === 'admin' ? (
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
                      <option value="Visita MEN">Visita MEN</option>
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
                    <label className="block text-sm font-medium text-slate-700">URL Pública de ClickUp (Embed)</label>
                    <input
                      type="url"
                      value={clickupUrl}
                      onChange={(e) => setClickupUrl(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                      placeholder="https://sharing.clickup.com/..."
                    />
                    <p className="mt-1 text-xs text-slate-500">Para previsualizar, usa el enlace público (Share {'->'} Public link {'->'} Embed).</p>
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
              ) : (
                <div className="w-full h-[600px] bg-slate-50 rounded-lg overflow-hidden">
                  <iframe 
                    src="https://tally.so/embed/npvKQB?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1" 
                    width="100%" 
                    height="100%" 
                    frameBorder="0" 
                    marginHeight={0} 
                    marginWidth={0} 
                    title="Solicitar Curso"
                  ></iframe>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
