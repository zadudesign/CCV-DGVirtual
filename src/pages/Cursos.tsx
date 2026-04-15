import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Loader2, Search, X, ExternalLink, LayoutDashboard, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Curso, User } from '../types';
import { getClickupUrlForRole } from '../lib/utils';
import { DynamicIcon } from '../components/DynamicIcon';

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
  const [tipoContrato, setTipoContrato] = useState<'Carga Académica - 5 Horas Semanales' | 'Prestación de Servicios - 1 o 2 Meses'>('Carga Académica - 5 Horas Semanales');
  const [clickupDisenoUrl, setClickupDisenoUrl] = useState('');
  const [clickupSoporteUrl, setClickupSoporteUrl] = useState('');
  const [clickupMultimediaUrl, setClickupMultimediaUrl] = useState('');
  const [clickupPedagogiaUrl, setClickupPedagogiaUrl] = useState('');
  const [driveUrl, setDriveUrl] = useState('');
  const [icon, setIcon] = useState('BookOpen');
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
      let query = supabase
        .from('cursos')
        .select(`
          *,
          docente:profiles!docente_id(name, email),
          evaluador:profiles!evaluador_id(name, email),
          creador:profiles!creador_id(name, email)
        `);

      if (user?.role === 'decano' && user.facultad) {
        query = query.eq('facultad', user.facultad);
      } else if (user?.role === 'coordinador' && user.programa) {
        query = query.eq('programa', user.programa);
      } else if (user?.role === 'docente') {
        query = query.eq('docente_id', user.id);
      } else if (user?.role === 'evaluador') {
        query = query.eq('evaluador_id', user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
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
      // Fetch posibles docentes
      let dQuery = supabase
        .from('profiles')
        .select('*')
        .in('role', ['docente', 'coordinador', 'decano']);
      
      if (user?.role === 'decano' && user.facultad) {
        dQuery = dQuery.eq('facultad', user.facultad);
      } else if (user?.role === 'coordinador' && user.programa) {
        dQuery = dQuery.eq('programa', user.programa);
      }
      
      const { data: dData } = await dQuery.order('name');
      if (dData) setDocentes(dData as User[]);

      // Fetch posibles evaluadores
      let eQuery = supabase
        .from('profiles')
        .select('*')
        .in('role', ['evaluador', 'docente', 'coordinador', 'decano']);
      
      if (user?.role === 'decano' && user.facultad) {
        eQuery = eQuery.eq('facultad', user.facultad);
      } else if (user?.role === 'coordinador' && user.programa) {
        eQuery = eQuery.eq('programa', user.programa);
      }
      
      const { data: eData } = await eQuery.order('name');
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
      } else if (user?.role === 'coordinador' && user.programa) {
        const { data } = await supabase
          .from('programas')
          .select('id, nombre')
          .eq('nombre', user.programa);
        pData = data || [];
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
          tipo_contrato: tipoContrato,
          clickup_diseno_url: clickupDisenoUrl || null,
          clickup_soporte_url: clickupSoporteUrl || null,
          clickup_multimedia_url: clickupMultimediaUrl || null,
          clickup_pedagogia_url: clickupPedagogiaUrl || null,
          drive_url: driveUrl || null,
          icon: icon || 'BookOpen'
        }]);

      if (error) throw error;
      
      setShowModal(false);
      setNombre('');
      setDocenteId('');
      setEvaluadorId('');
      setTipoSolicitud('Creación Completa');
      setSemestre(1);
      setTipoContrato('Carga Académica - 5 Horas Semanales');
      setClickupDisenoUrl('');
      setClickupSoporteUrl('');
      setClickupMultimediaUrl('');
      setClickupPedagogiaUrl('');
      setDriveUrl('');
      setIcon('BookOpen');
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

  const getProgramaColor = (programaName: string | undefined | null) => {
    if (!programaName || programaName === 'General') return 'bg-slate-100 text-slate-800';
    
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-purple-100 text-purple-800',
      'bg-pink-100 text-pink-800',
      'bg-indigo-100 text-indigo-800',
      'bg-teal-100 text-teal-800',
      'bg-emerald-100 text-emerald-800',
      'bg-cyan-100 text-cyan-800',
      'bg-orange-100 text-orange-800',
      'bg-rose-100 text-rose-800',
      'bg-fuchsia-100 text-fuchsia-800',
      'bg-violet-100 text-violet-800',
      'bg-sky-100 text-sky-800'
    ];
    
    let hash = 0;
    for (let i = 0; i < programaName.length; i++) {
      hash = programaName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const cursosFiltrados = cursos.filter(curso => {
    const matchSemestre = filtroSemestre ? curso.semestre?.toString() === filtroSemestre : true;
    const matchPrograma = filtroPrograma ? curso.programa === filtroPrograma : true;
    return matchSemestre && matchPrograma;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Gestión de Cursos</h1>
          <p className="mt-1 text-sm text-secondary">
            Solicita y administra los cursos virtuales de la plataforma.
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium"
          >
            <Plus className="h-5 w-5 mr-2" />
            {user?.role === 'admin' ? 'Cargar Curso' : 'Solicitar Curso'}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-muted/30 shadow-sm">
        <div className="flex-1">
          <label htmlFor="filtroPrograma" className="block text-sm font-medium text-text-main mb-1">
            Filtrar por Programa
          </label>
          <select
            id="filtroPrograma"
            value={filtroPrograma}
            onChange={(e) => setFiltroPrograma(e.target.value)}
            className="block w-full rounded-md border border-muted px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
          >
            <option value="">Todos los programas</option>
            {programasUnicos.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor="filtroSemestre" className="block text-sm font-medium text-text-main mb-1">
            Filtrar por Semestre
          </label>
          <select
            id="filtroSemestre"
            value={filtroSemestre}
            onChange={(e) => setFiltroSemestre(e.target.value)}
            className="block w-full rounded-md border border-muted px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
          >
            <option value="">Todos los semestres</option>
            {semestresUnicos.map(s => (
              <option key={s} value={s}>Semestre {s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow-sm rounded-xl border border-muted/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Curso</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Programa</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Semestre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Equipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Progreso</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </td>
                </tr>
              ) : cursosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-secondary">
                    No hay cursos registrados.
                  </td>
                </tr>
              ) : (
                cursosFiltrados.map((curso) => (
                  <tr key={curso.id} className="hover:bg-background">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link 
                        to={`/cursos/${curso.id}`} 
                        className="inline-flex items-center px-3 py-1.5 bg-primary text-white hover:bg-primary-hover rounded-md text-sm font-medium transition-colors shadow-sm"
                      >
                        <DynamicIcon name={curso.icon} className="h-4 w-4 mr-2" />
                        {curso.nombre}
                      </Link>
                      <div className="flex items-center mt-2 pl-1 space-x-3">
                        {getClickupUrlForRole(curso, user?.role) && (
                          <a 
                            href={getClickupUrlForRole(curso, user?.role)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-xs text-secondary hover:text-primary transition-colors"
                          >
                            <LayoutDashboard className="h-3.5 w-3.5 mr-1.5" />
                            Abrir Tablero ClickUp
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getProgramaColor(curso.programa)}`}>
                        {curso.programa || 'General'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                      {curso.semestre ? `Semestre ${curso.semestre}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-2">
                        <div>
                          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Docente</div>
                          <div className="text-sm text-text-main leading-tight">{curso.docente?.name || 'Sin asignar'}</div>
                        </div>
                        {curso.evaluador && (
                          <div>
                            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Par Evaluador</div>
                            <div className="text-sm text-text-main leading-tight">{curso.evaluador.name}</div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        curso.estado === 'Publicado' ? 'bg-green-100 text-green-800' :
                        curso.estado === 'Revisión' ? 'bg-amber-100 text-amber-800' :
                        curso.estado === 'En Desarrollo' ? 'bg-blue-100 text-blue-800' :
                        'bg-slate-100 text-text-main'
                      }`}>
                        {curso.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center flex-1">
                          <div className="w-full bg-slate-200 rounded-full h-2.5 mr-2 max-w-[100px]">
                            <div className="bg-primary h-2.5 rounded-full" style={{ width: `${curso.progreso_general || 0}%` }}></div>
                          </div>
                          <span className="text-xs text-secondary">{curso.progreso_general || 0}%</span>
                        </div>
                        {curso.clickup_list_id && (
                          <button
                            onClick={() => handleSyncClickUp(curso.id, curso.clickup_list_id!)}
                            disabled={syncingId === curso.id}
                            className="ml-2 text-primary hover:text-primary-hover disabled:opacity-50"
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
                <h3 className="text-lg font-medium leading-6 text-text-main">
                  {user?.role === 'admin' ? 'Cargar Nuevo Curso' : 'Solicitar Nuevo Curso'}
                </h3>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-secondary">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {user?.role === 'admin' ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-main">Tipo de Solicitud</label>
                    <select
                      required
                      value={tipoSolicitud}
                      onChange={(e) => setTipoSolicitud(e.target.value as any)}
                      className="mt-1 block w-full rounded-md border border-muted px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                    >
                      <option value="Creación Completa">Creación Completa</option>
                      <option value="Actualización">Actualización</option>
                      <option value="Visita MEN">Visita MEN</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-main">Nombre del Curso</label>
                    <input
                      type="text"
                      required
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-muted px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                      placeholder="Ej. Introducción a la Programación"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-main">Semestre</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      required
                      value={semestre}
                      onChange={(e) => setSemestre(parseInt(e.target.value))}
                      className="mt-1 block w-full rounded-md border border-muted px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                    />
                  </div>

                  {user?.role !== 'coordinador' && (
                    <div>
                      <label className="block text-sm font-medium text-text-main">Programa</label>
                      <select
                        required
                        value={programa}
                        onChange={(e) => setPrograma(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-muted px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                      >
                        <option value="">Seleccione un programa</option>
                        {programas.map((p) => (
                          <option key={p.id} value={p.nombre}>{p.nombre}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-text-main">Docente Asignado</label>
                    <select
                      required
                      value={docenteId}
                      onChange={(e) => setDocenteId(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-muted px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                    >
                      <option value="">Seleccione un docente</option>
                      {docentes.map((d) => (
                        <option key={d.id} value={d.id}>{d.name || d.email}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-main">Tipo de Contrato</label>
                    <select
                      required
                      value={tipoContrato}
                      onChange={(e) => setTipoContrato(e.target.value as any)}
                      className="mt-1 block w-full rounded-md border border-muted px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                    >
                      <option value="Carga Académica - 5 Horas Semanales">Carga Académica - 5 Horas Semanales</option>
                      <option value="Prestación de Servicios - 1 o 2 Meses">Prestación de Servicios - 1 o 2 Meses</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-main">Par Evaluador (Opcional)</label>
                    <select
                      value={evaluadorId}
                      onChange={(e) => setEvaluadorId(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-muted px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                    >
                      <option value="">Seleccione un evaluador</option>
                      {evaluadores.map((e) => (
                        <option key={e.id} value={e.id}>{e.name || e.email}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-text-main border-b border-muted pb-2">URLs Públicas de ClickUp (Embed)</h3>
                    
                    <div>
                      <label className="block text-xs font-medium text-secondary">Diseño</label>
                      <input
                        type="url"
                        value={clickupDisenoUrl}
                        onChange={(e) => setClickupDisenoUrl(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-muted px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                        placeholder="https://sharing.clickup.com/..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-secondary">Soporte</label>
                      <input
                        type="url"
                        value={clickupSoporteUrl}
                        onChange={(e) => setClickupSoporteUrl(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-muted px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                        placeholder="https://sharing.clickup.com/..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-secondary">Multimedia</label>
                      <input
                        type="url"
                        value={clickupMultimediaUrl}
                        onChange={(e) => setClickupMultimediaUrl(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-muted px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                        placeholder="https://sharing.clickup.com/..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-secondary">Pedagogía</label>
                      <input
                        type="url"
                        value={clickupPedagogiaUrl}
                        onChange={(e) => setClickupPedagogiaUrl(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-muted px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                        placeholder="https://sharing.clickup.com/..."
                      />
                    </div>
                    
                    <p className="mt-1 text-xs text-secondary">Para previsualizar, usa el enlace público (Share {'->'} Public link {'->'} Embed).</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-main">Enlace Carpeta Google Drive</label>
                    <input
                      type="url"
                      value={driveUrl}
                      onChange={(e) => setDriveUrl(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-muted px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                      placeholder="https://drive.google.com/drive/folders/..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-main">Icono (Lucide React)</label>
                    <input
                      type="text"
                      value={icon}
                      onChange={(e) => setIcon(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-muted px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                      placeholder="Ej. BookOpen, Code, Monitor"
                    />
                    <p className="mt-1 text-xs text-secondary">Escribe el nombre del icono en inglés (ej. BookOpen, Code, Monitor, FileText).</p>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 text-sm font-medium text-text-main bg-white border border-muted rounded-lg hover:bg-background"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex items-center px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-lg hover:bg-primary-hover disabled:opacity-50"
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      {user?.role === 'admin' ? 'Cargar Curso' : 'Solicitar Curso'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="w-full h-[600px] bg-background rounded-lg overflow-hidden">
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
