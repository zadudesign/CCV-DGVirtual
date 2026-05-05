import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Loader2, Search, X, ExternalLink, LayoutDashboard, Calendar, CheckCircle, MonitorPlay, ClipboardList, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Curso, User } from '../types';
import { getClickupUrlForRole } from '../lib/utils';
import { DynamicIcon } from '../components/DynamicIcon';
import { hasPermission } from '../lib/permissions';

import { Link, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const ESTADOS_SOLICITUD = [
  'Solicitud Recibida',
  'En Preparación',
  'Acceso a Google Drive',
  'En Construcción',
  'Pendiente de Aprobación',
  'Información Incompleta'
];

export default function Cursos() {
  const { user } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [nombre, setNombre] = useState('');
  const [programa, setPrograma] = useState('');
  const [docenteId, setDocenteId] = useState('');
  const [evaluadorId, setEvaluadorId] = useState('');
  const [tipoSolicitud, setTipoSolicitud] = useState<'Creación Completa' | 'Actualización' | 'Visita MEN'>('Creación Completa');
  const [semestre, setSemestre] = useState<number>(1);
  const [periodo, setPeriodo] = useState<string>('2026-I');
  const [tipoContrato, setTipoContrato] = useState<'Carga Académica - 5 Horas Semanales' | 'Prestación de Servicios - 1 o 2 Meses'>('Carga Académica - 5 Horas Semanales');
  const [clickupDisenoUrl, setClickupDisenoUrl] = useState('');
  const [clickupSoporteUrl, setClickupSoporteUrl] = useState('');
  const [clickupMultimediaUrl, setClickupMultimediaUrl] = useState('');
  const [clickupPedagogiaUrl, setClickupPedagogiaUrl] = useState('');
  const [clickupAdminUrl, setClickupAdminUrl] = useState('');
  const [driveUrl, setDriveUrl] = useState('');
  const [icon, setIcon] = useState('BookOpen');
  const [moodleUrl, setMoodleUrl] = useState('');
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [showSolicitudModal, setShowSolicitudModal] = useState(false);
  
  // Solicitud Form State
  const [solicitanteId, setSolicitanteId] = useState('');

  // Filters
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('');
  const [filtroPrograma, setFiltroPrograma] = useState<string>('');
  const canViewActivos = hasPermission(user, 'courses', 'tab_lista');
  const canViewSolicitudes = hasPermission(user, 'courses', 'tab_solicitudes');
  const [activeTab, setActiveTab] = useState<'activos' | 'solicitudes' | 'preparacion'>(() => {
    if ((location.state as any)?.tab === 'solicitudes' && canViewSolicitudes) return 'solicitudes';
    return canViewActivos ? 'activos' : canViewSolicitudes ? 'solicitudes' : 'activos';
  });

  const isTeamOrAdmin = user?.role === 'admin' || ['Soporte', 'Multimedia', 'Diseño', 'Pedagogía', 'team'].includes(user?.role || '');

  const { data: solicitantesData } = useQuery({
    queryKey: ['solicitantes'],
    queryFn: async () => {
      if (user?.role !== 'admin') return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['coordinador', 'decano'])
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: user?.role === 'admin'
  });
  const solicitantes = solicitantesData || [];

  const { data: cursosData, isLoading: loading } = useQuery({
    queryKey: ['cursos', activeTab, user?.id, user?.role, user?.facultad, user?.programa],
    queryFn: async () => {
      const isSolicitudesTab = (activeTab === 'solicitudes' || activeTab === 'preparacion') && isTeamOrAdmin;
      const table = isSolicitudesTab ? 'solicitudes_cursos' : 'cursos';
      
      const selectFields = isSolicitudesTab 
        ? '*' 
        : '*, docente:profiles!docente_id(name, email), evaluador:profiles!evaluador_id(name, email), creador:profiles!creador_id(name, email)';
      
      let query = supabase.from(table).select(selectFields);

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
      return data as any[];
    },
    enabled: !!user
  });
  const cursos = cursosData || [];

  const { data: optionsData } = useQuery({
    queryKey: ['cursos-options', user?.id, user?.role, user?.facultad, user?.programa],
    queryFn: async () => {
      const options = { docentes: [] as User[], evaluadores: [] as User[], programas: [] as any[] };
      if (!['admin', 'decano', 'coordinador'].includes(user?.role || '')) return options;

      // Fetch posibles docentes
      let dQuery = supabase.from('profiles').select('*').in('role', ['docente', 'coordinador', 'decano']);
      if (user?.role === 'decano' && user.facultad) dQuery = dQuery.eq('facultad', user.facultad);
      else if (user?.role === 'coordinador' && user.programa) dQuery = dQuery.eq('programa', user.programa);
      const { data: dData } = await dQuery.order('name');
      options.docentes = (dData || []) as User[];

      // Fetch posibles evaluadores
      let eQuery = supabase.from('profiles').select('*').in('role', ['evaluador', 'docente', 'coordinador', 'decano']);
      if (user?.role === 'decano' && user.facultad) eQuery = eQuery.eq('facultad', user.facultad);
      else if (user?.role === 'coordinador' && user.programa) eQuery = eQuery.eq('programa', user.programa);
      const { data: eData } = await eQuery.order('name');
      options.evaluadores = (eData || []) as User[];

      // Fetch programas
      if (user?.role === 'decano' && user.facultad) {
        const { data: fData } = await supabase.from('facultades').select('id').eq('nombre', user.facultad).single();
        if (fData) {
          const { data } = await supabase.from('programas').select('id, nombre').eq('facultad_id', fData.id);
          options.programas = data || [];
        }
      } else if (user?.role === 'coordinador' && user.programa) {
        const { data } = await supabase.from('programas').select('id, nombre').eq('nombre', user.programa);
        options.programas = data || [];
      } else {
        const { data } = await supabase.from('programas').select('id, nombre, facultades(nombre)');
        options.programas = data?.map((p: any) => ({
          id: p.id,
          nombre: p.nombre,
          facultad: p.facultades?.nombre
        })) || [];
      }
      return options;
    },
    enabled: !!user
  });
  
  const docentes = optionsData?.docentes || [];
  const evaluadores = optionsData?.evaluadores || [];
  const programas = optionsData?.programas || [];

  useEffect(() => {
    if (user?.role === 'coordinador' && user.programa) {
      setPrograma(user.programa);
    }
  }, [user]);

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
        .from('cursos') // Los admins cargan directamente a cursos activos
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
          periodo: periodo,
          tipo_contrato: tipoContrato,
          clickup_diseno_url: clickupDisenoUrl || null,
          clickup_soporte_url: clickupSoporteUrl || null,
          clickup_multimedia_url: clickupMultimediaUrl || null,
          clickup_pedagogia_url: clickupPedagogiaUrl || null,
          clickup_admin_url: clickupAdminUrl || null,
          drive_url: driveUrl || null,
          moodle_url: moodleUrl || null,
          icon: icon || 'BookOpen'
        }]);

      if (error) throw error;
      
      setShowModal(false);
      setNombre('');
      setDocenteId('');
      setEvaluadorId('');
      setTipoSolicitud('Creación Completa');
      setSemestre(1);
      setPeriodo('2026-I');
      setTipoContrato('Carga Académica - 5 Horas Semanales');
      setClickupDisenoUrl('');
      setClickupSoporteUrl('');
      setClickupMultimediaUrl('');
      setClickupPedagogiaUrl('');
      setClickupAdminUrl('');
      setDriveUrl('');
      setMoodleUrl('');
      setIcon('BookOpen');
      queryClient.invalidateQueries({ queryKey: ['cursos'] });
    } catch (err) {
      console.error('Error creating curso:', err);
      alert('Error al crear el curso');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEliminarSolicitud = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar la solicitud del curso "${nombre}"? Esta acción no se puede deshacer.`)) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('solicitudes_cursos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Solicitud eliminada correctamente.');
      queryClient.invalidateQueries({ queryKey: ['cursos'] });
    } catch (err) {
      console.error('Error deleting request:', err);
      alert('Error al eliminar la solicitud.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateEstadoSolicitud = async (id: string, nuevoEstado: string) => {
    if (user?.role !== 'admin') return;
    try {
      const { error } = await supabase
        .from('solicitudes_cursos')
        .update({ estado: nuevoEstado })
        .eq('id', id);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['cursos'] });
    } catch (err) {
      console.error('Error updating request status:', err);
      alert('Error al actualizar el estado de la solicitud.');
    }
  };

  const handleCargarSolicitud = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.role !== 'admin') return;
    
    setSubmitting(true);
    try {
      const solicitante = solicitantes.find(s => s.id === solicitanteId);
      if (!solicitante) throw new Error('Solicitante no encontrado');

      const selectedProg = programas.find(p => p.nombre === programa);
      const cursoFacultad = selectedProg?.facultad || 'General';

      const { error } = await supabase
        .from('solicitudes_cursos')
        .insert([{
          nombre,
          solicitado_por: solicitante.name,
          email: solicitante.email,
          telefono: solicitante.telefono || '',
          programa: programa || 'General',
          facultad: cursoFacultad,
          tipo_solicitud: tipoSolicitud,
          estado: 'Solicitud Recibida'
        }]);

      if (error) throw error;

      setShowSolicitudModal(false);
      setNombre('');
      setSolicitanteId('');
      setPrograma('');
      setTipoSolicitud('Creación Completa');
      queryClient.invalidateQueries({ queryKey: ['cursos'] });
      alert('Solicitud cargada correctamente');
    } catch (err) {
      console.error('Error loading request:', err);
      alert('Error al cargar la solicitud');
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
      queryClient.invalidateQueries({ queryKey: ['cursos'] });
    } catch (error) {
      console.error('Error syncing:', error);
      alert('Error al sincronizar con ClickUp. Verifica que el ID de la lista sea correcto y que la API Key esté configurada.');
    } finally {
      setSyncingId(null);
    }
  };

  const periodosUnicos = Array.from(new Set(cursos.map(c => c.periodo).filter(Boolean))).sort();
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
    if (activeTab === 'preparacion') {
      if ((curso.estado || 'Solicitud Recibida') !== 'En Preparación') return false;
    }
    const matchPeriodo = (activeTab === 'activos' && filtroPeriodo) ? curso.periodo === filtroPeriodo : true;
    const matchPrograma = filtroPrograma ? curso.programa === filtroPrograma : true;
    return matchPeriodo && matchPrograma;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center -mb-2">
        <div></div>
        {canCreate && (
          <div className="flex space-x-3">
            {user?.role === 'admin' && activeTab === 'solicitudes' && (
              <button
                onClick={() => setShowSolicitudModal(true)}
                className="flex items-center px-4 py-2 bg-white text-primary border border-primary rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
              >
                <Plus className="h-5 w-5 mr-2" />
                Cargar Solicitud
              </button>
            )}
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium"
            >
              <Plus className="h-5 w-5 mr-2" />
              {user?.role === 'admin' ? 'Cargar Curso' : 'Solicitar Curso'}
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-muted/30 -mb-px relative top-[1px]">
        {hasPermission(user, 'courses', 'tab_lista') && (
          <button
            onClick={() => setActiveTab('activos')}
            className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center ${
              activeTab === 'activos'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-secondary hover:text-text-main hover:bg-slate-50'
            }`}
          >
            <MonitorPlay className={`mr-2 h-4 w-4 ${activeTab === 'activos' ? 'text-primary' : 'text-slate-400'}`} />
            Activos
          </button>
        )}
        {hasPermission(user, 'courses', 'tab_solicitudes') && (
          <button
            onClick={() => setActiveTab('preparacion')}
            className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center ${
              activeTab === 'preparacion'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-secondary hover:text-text-main hover:bg-slate-50'
            }`}
          >
            <Clock className={`mr-2 h-4 w-4 ${activeTab === 'preparacion' ? 'text-primary' : 'text-slate-400'}`} />
            En Preparación
          </button>
        )}
        {hasPermission(user, 'courses', 'tab_solicitudes') && (
          <button
            onClick={() => setActiveTab('solicitudes')}
            className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center ${
              activeTab === 'solicitudes'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-secondary hover:text-text-main hover:bg-slate-50'
            }`}
          >
            <ClipboardList className={`mr-2 h-4 w-4 ${activeTab === 'solicitudes' ? 'text-primary' : 'text-slate-400'}`} />
            Solicitudes
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-muted/20 shadow-sm flex flex-wrap gap-4 mb-6 mt-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest mb-1.5 ml-1">
            Filtrar por Programa:
          </label>
          <select
            id="filtroPrograma"
            value={filtroPrograma}
            onChange={(e) => setFiltroPrograma(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
          >
            <option value="">Todos los programas</option>
            {programasUnicos.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        {activeTab === 'activos' && (
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest mb-1.5 ml-1">
              Filtrar por Periodo:
            </label>
            <select
              id="filtroPeriodo"
              value={filtroPeriodo}
              onChange={(e) => setFiltroPeriodo(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
            >
              <option value="">Todos los periodos</option>
              {periodosUnicos.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        )}
        
        {(filtroPrograma || filtroPeriodo) && (
          <button 
            onClick={() => { setFiltroPrograma(''); setFiltroPeriodo(''); }}
            className="self-end px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5 border border-transparent hover:border-red-100 mb-[2px]"
          >
            <X className="w-3.5 h-3.5" />
            Limpiar Filtros
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white shadow-sm rounded-xl border border-muted/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-background">
              <tr>
                {activeTab === 'solicitudes' || activeTab === 'preparacion' ? (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Curso / Tipo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Programa / Facultad</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Solicitante / Contacto</th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Curso</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Programa</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Semestre</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Equipo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Progreso</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={activeTab === 'solicitudes' || activeTab === 'preparacion' ? 4 : 6} className="px-6 py-4 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </td>
                </tr>
              ) : (
                cursosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={activeTab === 'solicitudes' || activeTab === 'preparacion' ? 4 : 6} className="px-6 py-4 text-center text-sm text-secondary">
                      No hay solicitudes o cursos registrados.
                    </td>
                  </tr>
                ) : activeTab === 'solicitudes' || activeTab === 'preparacion' ? (
                  (activeTab === 'preparacion' ? ['En Preparación'] : ESTADOS_SOLICITUD.filter(e => e !== 'En Preparación')).map(estado => {
                    const solicitudesEnEstado = cursosFiltrados.filter(c => (c.estado || 'Solicitud Recibida') === estado);
                    if (solicitudesEnEstado.length === 0) return null;
                    
                    const getEstadoHeaderStyles = (est: string) => {
                      switch (est) {
                        case 'Solicitud Recibida':
                        case 'En Construcción':
                          return 'bg-emerald-100/90 text-emerald-900 border-emerald-300 border-l-emerald-600';
                        case 'Pendiente de Aprobación':
                        case 'Información Incompleta':
                          return 'bg-red-100/90 text-red-900 border-red-300 border-l-red-600';
                        case 'En Preparación':
                        case 'Acceso a Google Drive':
                          return 'bg-blue-100/90 text-blue-900 border-blue-300 border-l-blue-600';
                        default:
                          return 'bg-slate-100/90 text-slate-900 border-slate-200 border-l-slate-600';
                      }
                    };

                    const getEstadoBadgeColor = (est: string) => {
                      switch (est) {
                        case 'Solicitud Recibida':
                        case 'En Construcción':
                          return 'bg-emerald-600 text-white';
                        case 'Pendiente de Aprobación':
                        case 'Información Incompleta':
                          return 'bg-red-600 text-white';
                        case 'En Preparación':
                        case 'Acceso a Google Drive':
                          return 'bg-blue-600 text-white';
                        default:
                          return 'bg-slate-600 text-white';
                      }
                    };
                    
                    const headerStyle = getEstadoHeaderStyles(estado);
                    const badgeColor = getEstadoBadgeColor(estado);

                    return (
                      <React.Fragment key={estado}>
                        <tr>
                          <td colSpan={4} className={`px-6 py-3 text-[11px] font-bold uppercase tracking-wider border-y border-l-4 ${headerStyle}`}>
                            <div className="flex items-center">
                              {estado}
                              <span className={`ml-3 px-2 py-0.5 rounded-full text-[10px] shadow-sm ${badgeColor}`}>
                                {solicitudesEnEstado.length}
                              </span>
                            </div>
                          </td>
                        </tr>
                        {solicitudesEnEstado.map((curso) => (
                          <tr key={curso.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              {user?.role === 'admin' ? (
                                <select
                                  value={curso.estado || 'Solicitud Recibida'}
                                  onChange={(e) => handleUpdateEstadoSolicitud(curso.id, e.target.value)}
                                  className={`text-[10px] font-bold uppercase tracking-wider border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none py-1.5 px-3 transition-all shadow-sm ${
                                    (curso.estado === 'Solicitud Recibida' || curso.estado === 'En Construcción') ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                                    (curso.estado === 'Pendiente de Aprobación' || curso.estado === 'Información Incompleta') ? 'bg-red-50 border-red-200 text-red-700' :
                                    (curso.estado === 'En Preparación' || curso.estado === 'Acceso a Google Drive') ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                    'bg-slate-50 border-slate-200 text-slate-700'
                                  }`}
                                >
                                  {ESTADOS_SOLICITUD.map(estado => (
                                    <option key={estado} value={estado} className="bg-white text-text-main normal-case font-normal">{estado}</option>
                                  ))}
                                </select>
                              ) : (
                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${
                                  (curso.estado === 'Solicitud Recibida' || curso.estado === 'En Construcción') ? 'bg-emerald-100 text-emerald-800' :
                                  (curso.estado === 'Pendiente de Aprobación' || curso.estado === 'Información Incompleta') ? 'bg-red-100 text-red-800' :
                                  (curso.estado === 'En Preparación' || curso.estado === 'Acceso a Google Drive') ? 'bg-blue-100 text-blue-800' :
                                  'bg-slate-100 text-slate-800'
                                }`}>
                                  {curso.estado || 'Solicitud Recibida'}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <div className="inline-flex items-center px-3 py-1.5 bg-slate-100 text-slate-600 rounded-md text-sm font-medium w-fit">
                                  <DynamicIcon name={curso.icon || 'BookOpen'} className="h-4 w-4 mr-2" />
                                  {curso.nombre}
                                </div>
                                <div className="mt-1.5">
                                  <span className="px-2 py-0.5 inline-flex text-[10px] leading-4 font-bold uppercase tracking-wider rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                    {curso.tipo_solicitud}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-text-main font-medium">{curso.programa}</div>
                              <div className="text-xs text-secondary">{curso.facultad}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-text-main font-medium">{curso.solicitado_por || 'N/A'}</div>
                              <div className="flex flex-col mt-0.5">
                                <div className="text-xs text-secondary">{curso.email || '-'}</div>
                                <div className="text-xs text-secondary">{curso.telefono || '-'}</div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })
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
                        <div>{curso.semestre ? `Semestre ${curso.semestre}` : '-'}</div>
                        {curso.periodo && <div className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">{curso.periodo}</div>}
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
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Cargar Solicitud (Admin Only) */}
      {showSolicitudModal && user?.role === 'admin' && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-slate-900 bg-opacity-75" onClick={() => setShowSolicitudModal(false)} />

            <div className="relative inline-block w-full max-w-md p-6 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-medium leading-6 text-text-main">
                  Cargar Nueva Solicitud
                </h3>
                <button onClick={() => setShowSolicitudModal(false)} className="text-slate-400 hover:text-secondary">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCargarSolicitud} className="space-y-4">
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
                  <label className="block text-sm font-medium text-text-main">Solicitado por</label>
                  <select
                    required
                    value={solicitanteId}
                    onChange={(e) => setSolicitanteId(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-muted px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                  >
                    <option value="">Seleccione un Coordinador o Decano</option>
                    {solicitantes.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                    ))}
                  </select>
                </div>

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

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowSolicitudModal(false)}
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
                    Cargar Solicitud
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

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

                  <div>
                    <label className="block text-sm font-medium text-text-main">Periodo Académico</label>
                    <select
                      required
                      value={periodo}
                      onChange={(e) => setPeriodo(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-muted px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                    >
                      <option value="2026-I">2026-I</option>
                      <option value="2026-II">2026-II</option>
                      <option value="2027-I">2027-I</option>
                      <option value="2027-II">2027-II</option>
                      <option value="2028-I">2028-I</option>
                      <option value="2028-II">2028-II</option>
                    </select>
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

                    <div>
                      <label className="block text-xs font-medium text-secondary">Admin</label>
                      <input
                        type="url"
                        value={clickupAdminUrl}
                        onChange={(e) => setClickupAdminUrl(e.target.value)}
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
                    <label className="block text-sm font-medium text-text-main">URL del Curso en Moodle</label>
                    <input
                      type="url"
                      value={moodleUrl}
                      onChange={(e) => setMoodleUrl(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-muted px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                      placeholder="https://moodle.ejemplo.com/course/view.php?id=..."
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
