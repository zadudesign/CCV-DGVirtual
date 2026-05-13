import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getClickupUrlForRole } from '../lib/utils';
import { DynamicIcon } from '../components/DynamicIcon';
import { ArrowLeft, FileText, PenTool, Bell, Loader2, Lightbulb, Copy, Check, CalendarDays, LayoutDashboard, HardDrive, Plus, Trash2, Edit2, ExternalLink, X, Eye, AlertCircle, AlertTriangle, CheckCircle2, History, MessageSquare, Filter, ArrowUpDown, BarChart2, Clock } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, RadialBarChart, RadialBar, PolarAngleAxis, Legend } from 'recharts';
import Calendario from './Calendario';
import RendimientoProductividad from '../components/RendimientoProductividad';
import { DocumentoCurso, NovedadCurso } from '../types';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function CursoDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'documentacion' | 'construccion' | 'novedades' | 'calendario' | 'rendimiento'>('construccion');
  const [copiedId, setCopiedId] = useState(false);
  
  // Novedades state
  const [showNovedadModal, setShowNovedadModal] = useState(false);
  const [submittingNovedad, setSubmittingNovedad] = useState(false);
  const [novedadForm, setNovedadForm] = useState({
    titulo: '',
    comentario: '',
    estado: 'Normal' as NovedadCurso['estado']
  });
  const [filtroEstadoNovedad, setFiltroEstadoNovedad] = useState<string>('Todos');
  const [ordenNovedades, setOrdenNovedades] = useState<'asc' | 'desc'>('desc');
  
  // Documentación state
  const [showDocModal, setShowDocModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocumentoCurso | null>(null);
  const [selectedDocForPreview, setSelectedDocForPreview] = useState<DocumentoCurso | null>(null);
  const [submittingDoc, setSubmittingDoc] = useState(false);
  const [docForm, setDocForm] = useState({
    documento: '',
    link: '',
    estado: 'Pendiente' as 'Pendiente' | 'En Revisión' | 'Completo',
    fecha: ''
  });

  const { data: curso, isLoading: loading } = useQuery({
    queryKey: ['curso', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cursos')
        .select(`
          *,
          docente:profiles!docente_id(name, email),
          evaluador:profiles!evaluador_id(name, email),
          creador:profiles!creador_id(name, email)
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      
      if (user?.role !== 'admin') {
        let hasAccess = false;
        if (user?.role === 'decano' && data.facultad === user.facultad) hasAccess = true;
        else if (user?.role === 'coordinador' && data.programa === user.programa) hasAccess = true;
        else if (user?.role === 'docente' && data.docente_id === user.id) hasAccess = true;
        else if (user?.role === 'evaluador' && data.evaluador_id === user.id) hasAccess = true;
        else if (['Soporte', 'Multimedia', 'Diseño', 'Pedagogía', 'team'].includes(user?.role || '')) hasAccess = true;
        
        if (!hasAccess) {
          navigate('/cursos');
          return null;
        }
      }
      return data;
    },
    enabled: !!id
  });

  const { data: documentosData, isLoading: loadingDocs } = useQuery({
    queryKey: ['documentos-curso', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documentos_cursos')
        .select('*')
        .eq('curso_id', id)
        .order('created_at', { ascending: true });
      if (error && error.code !== 'PGRST116') throw error;
      return data || [];
    },
    enabled: !!id
  });
  const documentos = documentosData || [];

  const { data: novedadesData, isLoading: loadingNovedades } = useQuery({
    queryKey: ['novedades-curso', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('novedades_curso')
        .select('*')
        .eq('curso_id', id)
        .order('created_at', { ascending: false });
      if (error && error.code !== '42P01') throw error;
      return data || [];
    },
    enabled: !!id
  });
  const novedades = novedadesData || [];
  
  useEffect(() => {
    if (id) {

      // Suscribirse a cambios en tiempo real en la tabla cursos para este curso específico
      const channel = supabase
        .channel(`curso_${id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'cursos',
            filter: `id=eq.${id}`
          },
          (payload) => {
            console.log('Cambio detectado en Supabase (Make actualizó los datos):', payload);
            queryClient.invalidateQueries({ queryKey: ['curso', id] });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [id, queryClient]);

  const handleSaveNovedad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !user || user.role !== 'admin') return;
    
    setSubmittingNovedad(true);
    try {
      const { error } = await supabase
        .from('novedades_curso')
        .insert([{
          curso_id: id,
          titulo: novedadForm.titulo,
          comentario: novedadForm.comentario,
          estado: novedadForm.estado
        }]);
      
      if (error) throw error;
      
      setNovedadForm({
        observacion: '',
        estado: 'Normal'
      });
      setShowNovedadModal(false);
      queryClient.invalidateQueries({ queryKey: ['novedades-curso', id] });
    } catch (err: any) {
      console.error('Error saving novedad:', err);
      alert('Error al guardar la novedad: ' + (err.message || 'Error desconocido'));
    } finally {
      setSubmittingNovedad(false);
    }
  };

  const handleSaveDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !user) return;
    
    setSubmittingDoc(true);
    try {
      const docData = {
        curso_id: id,
        documento: docForm.documento,
        link: docForm.link || null,
        estado: docForm.estado,
        fecha: docForm.estado === 'Completo' ? (docForm.fecha || new Date().toISOString().split('T')[0]) : (docForm.fecha || null)
      };

      if (editingDoc) {
        const { error } = await supabase
          .from('documentos_cursos')
          .update(docData)
          .eq('id', editingDoc.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('documentos_cursos')
          .insert([docData]);
        if (error) throw error;
      }

      setShowDocModal(false);
      setEditingDoc(null);
      setDocForm({ documento: '', link: '', estado: 'Pendiente', fecha: '' });
      queryClient.invalidateQueries({ queryKey: ['documentos-curso', id] });
    } catch (err) {
      console.error('Error saving document:', err);
      alert('Error al guardar el documento. Asegúrate de que la tabla "documentos_cursos" haya sido creada en Supabase.');
    } finally {
      setSubmittingDoc(false);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este documento?')) return;
    
    try {
      const { error } = await supabase
        .from('documentos_cursos')
        .delete()
        .eq('id', docId);
      
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['documentos-curso', id] });
    } catch (err) {
      console.error('Error deleting document:', err);
      alert('Error al eliminar el documento');
    }
  };

  const handleUpdateFechaInicio = async (newDate: string) => {
    if (!id || user?.role !== 'admin') return;
    
    try {
      const { error } = await supabase
        .from('cursos')
        .update({ fecha_inicio: newDate })
        .eq('id', id);
        
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['curso', id] });
    } catch (err) {
      console.error('Error updating fecha_inicio:', err);
      alert('Error al actualizar la fecha de inicio');
    }
  };

  const handleUpdateDuracion = async (newDuracion: string) => {
    if (!id || user?.role !== 'admin') return;
    
    try {
      const parsedDuracion = parseInt(newDuracion, 10) || null;
      const { error } = await supabase
        .from('cursos')
        .update({ duracion: parsedDuracion })
        .eq('id', id);
        
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['curso', id] });
    } catch (err: any) {
      console.error('Error updating duracion:', err);
      // We alert so the user knows if the column is missing
      alert('Error al actualizar la duración. ' + (err.message || ''));
    }
  };

  const handleUpdateMoodleUrl = async (newUrl: string) => {
    if (!id || user?.role !== 'admin') return;
    
    try {
      const { error } = await supabase
        .from('cursos')
        .update({ moodle_url: newUrl })
        .eq('id', id);
        
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['curso', id] });
    } catch (err) {
      console.error('Error updating moodle_url:', err);
      alert('Error al actualizar la URL de Moodle');
    }
  };

  const handleUpdateDocStatus = async (docId: string, nuevoEstado: 'Pendiente' | 'En Revisión' | 'Completo') => {
    try {
      const updateData: any = { estado: nuevoEstado };
      if (nuevoEstado === 'Completo') {
        updateData.fecha = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('documentos_cursos')
        .update(updateData)
        .eq('id', docId);
      
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['documentos-curso', id] });
    } catch (err) {
      console.error('Error updating document status:', err);
      alert('Error al actualizar el estado');
    }
  };

  const handleEditDoc = (doc: DocumentoCurso) => {
    setEditingDoc(doc);
    setDocForm({
      documento: doc.documento,
      link: doc.link || '',
      estado: doc.estado,
      fecha: doc.fecha || ''
    });
    setShowDocModal(true);
  };

  const getEmbedUrl = (url: string | undefined) => {
    if (!url) return '';
    // Para Google Drive, cambiamos /view por /preview para que permita el embed en un iframe
    if (url.includes('drive.google.com')) {
      return url.replace(/\/view(\?.*)?$/, '/preview');
    }
    return url;
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(curso.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!curso) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-text-main">Curso no encontrado</h3>
        <button onClick={() => navigate('/cursos')} className="mt-4 text-primary hover:text-primary-hover">
          Volver a cursos
        </button>
      </div>
    );
  }

  // Data for the charts
  const generalProgress = curso.progreso_general ?? curso.progreso ?? 0;
  const generalData = [
    { name: 'Completado', value: generalProgress },
    { name: 'Restante', value: 100 - generalProgress }
  ];

  const procesosData = [
    { name: 'Soporte', value: curso.progreso_soporte ?? 0, fill: '#ffcc00' },
    { name: 'Edición', value: curso.progreso_edicion ?? 0, fill: '#99cc00' },
    { name: 'Grabación', value: curso.progreso_grabacion ?? 0, fill: '#ff3333' },
    { name: 'Documentación', value: curso.progreso_documentacion ?? 0, fill: '#00bfff' },
  ];

  // Filter and sort novedades
  const novedadesFiltradasYOrdenadas = novedades
    .filter((n) => filtroEstadoNovedad === 'Todos' || n.estado === filtroEstadoNovedad)
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return ordenNovedades === 'desc' ? dateB - dateA : dateA - dateB;
    });

  const getProgramaTheme = (programaName: string | undefined | null) => {
    if (!programaName || programaName === 'General') {
      return { 
        bg: 'bg-slate-100', 
        text: 'text-slate-900', 
        textMuted: 'text-slate-600', 
        badgeBg: 'bg-white', 
        badgeText: 'text-slate-800', 
        border: 'border-slate-200',
        watermark: 'text-slate-900/5',
        buttonBg: 'bg-white/60',
        buttonHover: 'hover:bg-white/90',
        buttonBorder: 'border-slate-200'
      };
    }
    
    const themes = [
      { bg: 'bg-blue-50', text: 'text-slate-900', textMuted: 'text-slate-600', badgeBg: 'bg-blue-100', badgeText: 'text-blue-800', border: 'border-blue-200', watermark: 'text-blue-900/5', buttonBg: 'bg-white/60', buttonHover: 'hover:bg-white/90', buttonBorder: 'border-blue-200' },
      { bg: 'bg-purple-50', text: 'text-slate-900', textMuted: 'text-slate-600', badgeBg: 'bg-purple-100', badgeText: 'text-purple-800', border: 'border-purple-200', watermark: 'text-purple-900/5', buttonBg: 'bg-white/60', buttonHover: 'hover:bg-white/90', buttonBorder: 'border-purple-200' },
      { bg: 'bg-pink-50', text: 'text-slate-900', textMuted: 'text-slate-600', badgeBg: 'bg-pink-100', badgeText: 'text-pink-800', border: 'border-pink-200', watermark: 'text-pink-900/5', buttonBg: 'bg-white/60', buttonHover: 'hover:bg-white/90', buttonBorder: 'border-pink-200' },
      { bg: 'bg-indigo-50', text: 'text-slate-900', textMuted: 'text-slate-600', badgeBg: 'bg-indigo-100', badgeText: 'text-indigo-800', border: 'border-indigo-200', watermark: 'text-indigo-900/5', buttonBg: 'bg-white/60', buttonHover: 'hover:bg-white/90', buttonBorder: 'border-indigo-200' },
      { bg: 'bg-teal-50', text: 'text-slate-900', textMuted: 'text-slate-600', badgeBg: 'bg-teal-100', badgeText: 'text-teal-800', border: 'border-teal-200', watermark: 'text-teal-900/5', buttonBg: 'bg-white/60', buttonHover: 'hover:bg-white/90', buttonBorder: 'border-teal-200' },
      { bg: 'bg-emerald-50', text: 'text-slate-900', textMuted: 'text-slate-600', badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-800', border: 'border-emerald-200', watermark: 'text-emerald-900/5', buttonBg: 'bg-white/60', buttonHover: 'hover:bg-white/90', buttonBorder: 'border-emerald-200' },
      { bg: 'bg-cyan-50', text: 'text-slate-900', textMuted: 'text-slate-600', badgeBg: 'bg-cyan-100', badgeText: 'text-cyan-800', border: 'border-cyan-200', watermark: 'text-cyan-900/5', buttonBg: 'bg-white/60', buttonHover: 'hover:bg-white/90', buttonBorder: 'border-cyan-200' },
      { bg: 'bg-orange-50', text: 'text-slate-900', textMuted: 'text-slate-600', badgeBg: 'bg-orange-100', badgeText: 'text-orange-800', border: 'border-orange-200', watermark: 'text-orange-900/5', buttonBg: 'bg-white/60', buttonHover: 'hover:bg-white/90', buttonBorder: 'border-orange-200' },
      { bg: 'bg-rose-50', text: 'text-slate-900', textMuted: 'text-slate-600', badgeBg: 'bg-rose-100', badgeText: 'text-rose-800', border: 'border-rose-200', watermark: 'text-rose-900/5', buttonBg: 'bg-white/60', buttonHover: 'hover:bg-white/90', buttonBorder: 'border-rose-200' },
      { bg: 'bg-fuchsia-50', text: 'text-slate-900', textMuted: 'text-slate-600', badgeBg: 'bg-fuchsia-100', badgeText: 'text-fuchsia-800', border: 'border-fuchsia-200', watermark: 'text-fuchsia-900/5', buttonBg: 'bg-white/60', buttonHover: 'hover:bg-white/90', buttonBorder: 'border-fuchsia-200' },
      { bg: 'bg-violet-50', text: 'text-slate-900', textMuted: 'text-slate-600', badgeBg: 'bg-violet-100', badgeText: 'text-violet-800', border: 'border-violet-200', watermark: 'text-violet-900/5', buttonBg: 'bg-white/60', buttonHover: 'hover:bg-white/90', buttonBorder: 'border-violet-200' },
      { bg: 'bg-sky-50', text: 'text-slate-900', textMuted: 'text-slate-600', badgeBg: 'bg-sky-100', badgeText: 'text-sky-800', border: 'border-sky-200', watermark: 'text-sky-900/5', buttonBg: 'bg-white/60', buttonHover: 'hover:bg-white/90', buttonBorder: 'border-sky-200' }
    ];
    
    let hash = 0;
    for (let i = 0; i < programaName.length; i++) {
      hash = programaName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const index = Math.abs(hash) % themes.length;
    return themes[index];
  };

  const theme = getProgramaTheme(curso.programa);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className={`relative rounded-xl shadow-sm overflow-hidden border ${theme.border} ${theme.bg}`}>
        {/* Background Watermark Icon */}
        <div className="absolute -right-12 -bottom-16 pointer-events-none select-none">
          <DynamicIcon name={curso.icon} className={`w-80 h-80 ${theme.watermark}`} />
        </div>

        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex items-start space-x-4">
            <button 
              onClick={() => navigate('/cursos')}
              className={`mt-1 p-2 rounded-full ${theme.buttonBg} ${theme.buttonHover} ${theme.textMuted} transition-colors shrink-0`}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div>
                    <h1 className={`text-2xl sm:text-4xl font-bold ${theme.text} leading-tight tracking-tight`}>
                      {curso.nombre}
                    </h1>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full ${theme.badgeBg} ${theme.badgeText} border ${theme.border}`}>
                        {curso.programa || 'General'}
                      </span>
                      <span className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full ${
                        curso.estado === 'Publicado' ? 'bg-green-100 text-green-800 border-green-200' :
                        curso.estado === 'Revisión' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                        curso.estado === 'En Desarrollo' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                        'bg-slate-100 text-slate-800 border-slate-200'
                      } border`}>
                        {curso.estado}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleCopyId}
                    className={`flex items-center px-3 py-1.5 text-sm font-medium ${theme.buttonBg} ${theme.text} border ${theme.buttonBorder} rounded-lg ${theme.buttonHover} transition-colors backdrop-blur-sm`}
                    title="Copiar ID de Supabase para Make"
                  >
                    {copiedId ? <Check className="h-4 w-4 mr-1.5 text-green-600" /> : <Copy className="h-4 w-4 mr-1.5" />}
                    {copiedId ? 'Copiado' : 'Copiar ID'}
                  </button>
                  {getClickupUrlForRole(curso, user?.role) && (
                    <a 
                      href={getClickupUrlForRole(curso, user?.role)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`flex items-center px-3 py-1.5 text-sm font-medium ${theme.buttonBg} ${theme.text} border ${theme.buttonBorder} rounded-lg ${theme.buttonHover} transition-colors backdrop-blur-sm`}
                      title="Abrir Tablero en ClickUp"
                    >
                      <LayoutDashboard className="h-4 w-4 mr-1.5" />
                      Abrir en ClickUp
                    </a>
                  )}
                  {curso.drive_url && (
                    <a 
                      href={curso.drive_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`flex items-center px-3 py-1.5 text-sm font-medium bg-white text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all shadow-sm hover:shadow-md hover:scale-105 active:scale-95`}
                      title="Abrir Carpeta en Google Drive"
                    >
                      <HardDrive className="w-4 h-4 mr-1.5 text-primary" />
                      Google Drive
                    </a>
                  )}
                </div>
              </div>

              {/* Ficha Técnica */}
              <div className={`mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 pt-6 border-t ${theme.border}`}>
                <div>
                  <div className={`text-[10px] font-semibold ${theme.textMuted} uppercase tracking-wider mb-1`}>Docente</div>
                  <div className={`text-sm font-medium ${theme.text}`}>{curso.docente?.name || 'Sin asignar'}</div>
                </div>
                <div>
                  <div className={`text-[10px] font-semibold ${theme.textMuted} uppercase tracking-wider mb-1`}>Par Evaluador</div>
                  <div className={`text-sm font-medium ${theme.text}`}>{curso.evaluador?.name || 'Sin asignar'}</div>
                </div>
                <div>
                  <div className={`text-[10px] font-semibold ${theme.textMuted} uppercase tracking-wider mb-1`}>Semestre</div>
                  <div className={`text-sm font-medium ${theme.text}`}>{curso.semestre ? `Semestre ${curso.semestre}` : 'No definido'}</div>
                </div>
                <div>
                  <div className={`text-[10px] font-semibold ${theme.textMuted} uppercase tracking-wider mb-1`}>Periodo</div>
                  <div className={`text-sm font-medium ${theme.text}`}>{curso.periodo || 'No definido'}</div>
                </div>
                <div>
                  <div className={`text-[10px] font-semibold ${theme.textMuted} uppercase tracking-wider mb-2`}>Curso en Moodle</div>
                  <div className="flex items-center space-x-2">
                    {curso.moodle_url ? (
                      <a 
                        href={curso.moodle_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1.5 text-xs font-bold bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-all shadow-sm hover:shadow-md hover:scale-105 active:scale-95"
                      >
                        <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                        Acceder al Curso
                      </a>
                    ) : (
                      <span className={`text-xs ${theme.textMuted} italic px-3 py-1.5 bg-slate-100 rounded-lg border border-dashed border-slate-300 w-full text-center block`}>No configurado</span>
                    )}
                    {user?.role === 'admin' && (
                      <button 
                        onClick={() => {
                          const url = prompt('Ingrese la URL del curso en Moodle:', curso.moodle_url || '');
                          if (url !== null) handleUpdateMoodleUrl(url);
                        }}
                        className="p-1.5 bg-white border border-slate-200 hover:border-primary hover:text-primary rounded-lg shadow-sm transition-all text-slate-400"
                        title="Configurar URL de Moodle"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-muted/30">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('construccion')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'construccion'
                ? 'border-primary text-primary'
                : 'border-transparent text-secondary hover:text-text-main hover:border-muted'
            }`}
          >
            <PenTool className="h-4 w-4 mr-2" />
            Construcción
          </button>
          <button
            onClick={() => setActiveTab('documentacion')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'documentacion'
                ? 'border-primary text-primary'
                : 'border-transparent text-secondary hover:text-text-main hover:border-muted'
            }`}
          >
            <FileText className="h-4 w-4 mr-2" />
            Documentación
          </button>
          <button
            onClick={() => setActiveTab('novedades')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'novedades'
                ? 'border-primary text-primary'
                : 'border-transparent text-secondary hover:text-text-main hover:border-muted'
            }`}
          >
            <Bell className="h-4 w-4 mr-2" />
            Novedades
          </button>
          <button
            onClick={() => setActiveTab('calendario')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'calendario'
                ? 'border-primary text-primary'
                : 'border-transparent text-secondary hover:text-text-main hover:border-muted'
            }`}
          >
            <CalendarDays className="h-4 w-4 mr-2" />
            Calendario de Trabajo
          </button>
          <button
            onClick={() => setActiveTab('rendimiento')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'rendimiento'
                ? 'border-primary text-primary'
                : 'border-transparent text-secondary hover:text-text-main hover:border-muted'
            }`}
          >
            <BarChart2 className="h-4 w-4 mr-2" />
            Rendimiento y Productividad
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'rendimiento' && (
          <RendimientoProductividad cursoId={id!} />
        )}
        {activeTab === 'construccion' && (
          <div className="space-y-8">
            <div className="bg-[#222631] rounded-2xl shadow-lg border border-slate-800 p-8 max-w-5xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left Column: Promedio General */}
                <div className="flex flex-col items-center justify-center relative">
                  <div className="relative w-64 h-64 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart 
                        cx="50%" cy="50%" 
                        innerRadius="80%" outerRadius="100%" 
                        barSize={15} 
                        data={[{ name: 'General', value: generalProgress, fill: '#00bfff' }]} 
                        startAngle={90} endAngle={-270}
                      >
                        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                        <RadialBar background={{ fill: '#334155' }} dataKey="value" cornerRadius={10} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-5xl font-bold text-white">{generalProgress.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="mt-6 text-2xl font-bold text-slate-300 tracking-wider">
                    PROMEDIO GENERAL
                  </div>
                </div>

                {/* Right Column: Promedios específicos */}
                <div className="flex flex-col items-center justify-center">
                  <div className="text-slate-400 text-sm mb-2 font-medium tracking-widest uppercase">Promedios por Proceso</div>
                  <div className="w-full h-64 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart 
                        cx="50%" cy="50%" 
                        innerRadius="30%" outerRadius="100%" 
                        barSize={12} 
                        data={procesosData} 
                        startAngle={90} endAngle={-270}
                      >
                        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                        <RadialBar background={{ fill: '#334155' }} dataKey="value" cornerRadius={10} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1e222d', borderColor: '#334155', color: '#fff', borderRadius: '8px' }}
                          itemStyle={{ color: '#fff' }}
                          formatter={(value: number) => [`${value.toFixed(1)}%`, 'Progreso']}
                        />
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Legend */}
                  <div className="flex justify-center gap-8 mt-6 flex-wrap">
                    {[...procesosData].reverse().map((proceso, idx) => (
                      <div key={idx} className="flex flex-col items-center">
                        <div className="relative w-20 h-20 flex items-center justify-center mb-3">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadialBarChart 
                              cx="50%" cy="50%" 
                              innerRadius="70%" outerRadius="100%" 
                              barSize={6} 
                              data={[{ name: proceso.name, value: proceso.value, fill: proceso.fill }]} 
                              startAngle={90} endAngle={-270}
                            >
                              <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                              <RadialBar background={{ fill: '#334155' }} dataKey="value" cornerRadius={10} />
                            </RadialBarChart>
                          </ResponsiveContainer>
                          <span className="absolute text-sm font-bold text-white">{proceso.value.toFixed(0)}%</span>
                        </div>
                        <span className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold">{proceso.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'documentacion' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-muted/30 overflow-hidden">
              <div className="px-6 py-4 border-b border-muted/30 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="text-lg font-bold text-text-main flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-primary" />
                    Listado de Documentación Requerida
                  </h3>
                  <p className="text-xs text-secondary mt-1">
                    Gestione los documentos obligatorios que deben estar diligenciados para este curso.
                  </p>
                </div>
                {user?.role === 'admin' && (
                  <button 
                    onClick={() => {
                      setEditingDoc(null);
                      setDocForm({ documento: '', link: '', estado: 'Pendiente', fecha: '' });
                      setShowDocModal(true);
                    }}
                    className="flex items-center px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-hover transition-colors shadow-sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Documento
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50/80">
                    <tr>
                      <th className="px-6 py-3 text-left text-[10px] font-bold text-secondary uppercase tracking-widest">Documento</th>
                      <th className="px-6 py-3 text-left text-[10px] font-bold text-secondary uppercase tracking-widest">Estado</th>
                      <th className="px-6 py-3 text-left text-[10px] font-bold text-secondary uppercase tracking-widest">Fecha Completado</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {loadingDocs ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-12 text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                        </td>
                      </tr>
                    ) : documentos.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-12 text-center flex flex-col items-center">
                          <FileText className="h-10 w-10 text-slate-200 mb-2" />
                          <p className="text-sm text-secondary">No hay documentos registrados para este curso.</p>
                          {user?.role === 'admin' && (
                            <button 
                              onClick={() => setShowDocModal(true)}
                              className="mt-4 text-xs font-bold text-primary hover:underline"
                            >
                              Agregar el primer documento
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      documentos.map((doc) => (
                        <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="p-2 bg-slate-100 rounded-lg mr-3">
                                <FileText className="h-4 w-4 text-slate-500" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-text-main">{doc.documento}</span>
                                {doc.link && (
                                  <a 
                                    href={doc.link} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-[10px] text-primary hover:underline flex items-center mt-1"
                                  >
                                    <ExternalLink className="h-2.5 w-2.5 mr-1" />
                                    Visualizar en Drive
                                  </a>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {user?.role === 'admin' ? (
                              <select
                                value={doc.estado}
                                onChange={(e) => handleUpdateDocStatus(doc.id, e.target.value as any)}
                                className={`text-[10px] font-bold uppercase tracking-wider border rounded-md py-1 px-2 focus:ring-1 focus:ring-primary focus:outline-none ${
                                  doc.estado === 'Completo' ? 'bg-green-50 text-green-700 border-green-100' :
                                  doc.estado === 'En Revisión' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                  'bg-slate-50 text-slate-600 border-slate-200'
                                }`}
                              >
                                <option value="Pendiente">Pendiente</option>
                                <option value="En Revisión">En Revisión</option>
                                <option value="Completo">Completo</option>
                              </select>
                            ) : (
                              <span className={`px-2 py-0.5 inline-flex text-[10px] leading-4 font-bold uppercase tracking-wider rounded-full ${
                                doc.estado === 'Completo' ? 'bg-green-100 text-green-800' :
                                doc.estado === 'En Revisión' ? 'bg-amber-100 text-amber-800' :
                                'bg-slate-100 text-slate-800'
                              }`}>
                                {doc.estado}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                            {doc.fecha ? new Date(doc.fecha).toLocaleDateString() : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal para Documentos */}
            {showDocModal && (
              <div className="fixed inset-0 z-[60] overflow-y-auto">
                <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
                  <div className="fixed inset-0 transition-opacity bg-slate-900 bg-opacity-75" onClick={() => setShowDocModal(false)} />

                  <div className="relative inline-block w-full max-w-md p-6 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
                    <div className="flex justify-between items-center mb-5">
                      <h3 className="text-lg font-bold text-text-main">
                        {editingDoc ? 'Editar Documento' : 'Nuevo Documento Requerido'}
                      </h3>
                      <button onClick={() => setShowDocModal(false)} className="text-slate-400 hover:text-secondary">
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveDoc} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">Nombre del Documento</label>
                        <input
                          type="text"
                          required
                          value={docForm.documento}
                          onChange={(e) => setDocForm({ ...docForm, documento: e.target.value })}
                          className="w-full rounded-lg border border-muted px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="Ej. Guía Didáctica"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">Link de Google Drive (Vista Pública)</label>
                        <input
                          type="url"
                          value={docForm.link}
                          onChange={(e) => setDocForm({ ...docForm, link: e.target.value })}
                          className="w-full rounded-lg border border-muted px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="https://drive.google.com/file/d/..."
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">Estado</label>
                          <select
                            value={docForm.estado}
                            onChange={(e) => setDocForm({ ...docForm, estado: e.target.value as any })}
                            className="w-full rounded-lg border border-muted px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            <option value="Pendiente">Pendiente</option>
                            <option value="En Revisión">En Revisión</option>
                            <option value="Completo">Completo</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">Fecha Completado</label>
                          <input
                            type="date"
                            disabled={docForm.estado !== 'Completo'}
                            value={docForm.fecha}
                            onChange={(e) => setDocForm({ ...docForm, fecha: e.target.value })}
                            className="w-full rounded-lg border border-muted px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-slate-50 disabled:text-slate-400"
                          />
                        </div>
                      </div>

                      <div className="mt-8 flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => setShowDocModal(false)}
                          className="px-4 py-2 text-sm font-bold text-secondary border border-muted rounded-lg hover:bg-slate-50"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={submittingDoc}
                          className="flex items-center px-6 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-50"
                        >
                          {submittingDoc && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                          {editingDoc ? 'Actualizar' : 'Crear Documento'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* Modal para Visualización de Documentos (Iframe) */}
            {selectedDocForPreview && (
              <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setSelectedDocForPreview(null)} />
                <div className="relative bg-white w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                  <div className="px-6 py-4 border-b border-muted/30 flex justify-between items-center bg-white">
                    <div className="flex items-center">
                      <div className="p-2 bg-slate-100 rounded-lg mr-3">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="text-lg font-bold text-text-main truncate max-w-md">
                        {selectedDocForPreview.documento}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <a 
                        href={selectedDocForPreview.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-full transition-all"
                        title="Abrir en Google Drive"
                      >
                        <ExternalLink className="h-5 w-5" />
                      </a>
                      <button 
                        onClick={() => setSelectedDocForPreview(null)}
                        className="p-2 text-slate-500 hover:text-red-500 hover:bg-slate-100 rounded-full transition-all"
                      >
                        <X className="h-6 w-6" />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 bg-slate-100 relative">
                    <iframe 
                      src={getEmbedUrl(selectedDocForPreview.link)} 
                      className="w-full h-full border-none shadow-inner"
                      title={selectedDocForPreview.documento}
                      allow="autoplay"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'novedades' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-muted/30">
              <div>
                <h2 className="text-xl font-bold text-text-main flex items-center">
                  <Bell className="h-6 w-6 text-primary mr-2" />
                  Novedades del Curso
                </h2>
                <p className="text-sm text-secondary mt-1">Historial de actualizaciones y comentarios importantes sobre el progreso.</p>
              </div>
              {user?.role === 'admin' && (
                <button
                  onClick={() => setShowNovedadModal(true)}
                  className="flex items-center px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-hover transition-colors shadow-sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Novedad
                </button>
              )}
            </div>

            {/* Barra de Filtros y Orden */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50/50 p-4 rounded-xl border border-muted/20">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-secondary" />
                  <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">Filtrar Estado:</span>
                  <select 
                    value={filtroEstadoNovedad}
                    onChange={(e) => setFiltroEstadoNovedad(e.target.value)}
                    className="text-xs py-1.5 pl-3 pr-8 rounded-lg border border-muted bg-white focus:outline-none focus:ring-1 focus:ring-primary shadow-sm appearance-none relative"
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2364748b\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1rem' }}
                  >
                    <option value="Todos">Todos los estados</option>
                    <option value="Normal">Normal</option>
                    <option value="Importante">Importante</option>
                    <option value="Crítico">Crítico</option>
                    <option value="Completado">Completado</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setOrdenNovedades(ordenNovedades === 'desc' ? 'asc' : 'desc')}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-lg border border-muted bg-white hover:bg-slate-50 transition-all shadow-sm group"
                >
                  <ArrowUpDown className={`h-3.5 w-3.5 transition-transform duration-300 ${ordenNovedades === 'asc' ? 'rotate-180' : ''} text-primary`} />
                  <span className="text-[10px] font-bold text-secondary uppercase tracking-widest group-hover:text-primary">
                    {ordenNovedades === 'desc' ? 'Más recientes primero' : 'Más antiguas primero'}
                  </span>
                </button>
              </div>
            </div>

            {loadingNovedades ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              </div>
            ) : novedades.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-muted/30 p-12 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                  <History className="h-8 w-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-text-main">Sin novedades aún</h3>
                <p className="text-secondary mt-2 max-w-sm mx-auto">
                  Aún no se han registrado novedades para este curso. Las novedades ayudan al equipo a seguir el progreso y los cambios importantes.
                </p>
                {user?.role === 'admin' && (
                  <button
                    onClick={() => setShowNovedadModal(true)}
                    className="mt-6 text-primary font-bold text-sm hover:underline"
                  >
                    Registrar la primera novedad
                  </button>
                )}
              </div>
            ) : novedadesFiltradasYOrdenadas.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-muted/30 p-12 text-center">
                <Filter className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-text-main">No hay resultados</h3>
                <p className="text-secondary mt-2">No se encontraron novedades con el estado "{filtroEstadoNovedad}".</p>
                <button 
                  onClick={() => setFiltroEstadoNovedad('Todos')}
                  className="mt-4 text-primary font-bold text-sm hover:underline"
                >
                  Ver todas las novedades
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {novedadesFiltradasYOrdenadas.map((novedad) => (
                  <div 
                    key={novedad.id} 
                    className="bg-white rounded-xl shadow-sm border border-muted/30 overflow-hidden transition-all hover:shadow-md"
                  >
                    <div className="flex">
                      <div className={`w-1 transition-colors ${
                        novedad.estado === 'Crítico' ? 'bg-red-500' :
                        novedad.estado === 'Importante' ? 'bg-amber-500' :
                        novedad.estado === 'Completado' ? 'bg-emerald-500' :
                        'bg-slate-300'
                      }`} />
                      <div className="p-4 flex-1">
                        <div className="flex flex-col md:grid md:grid-cols-[250px_1fr] gap-4">
                          {/* Columna 1: Info Básica */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`p-2 rounded-lg flex-shrink-0 ${
                              novedad.estado === 'Crítico' ? 'bg-red-50 text-red-600' :
                              novedad.estado === 'Importante' ? 'bg-amber-50 text-amber-600' :
                              novedad.estado === 'Completado' ? 'bg-emerald-50 text-emerald-600' :
                              'bg-slate-50 text-slate-600'
                            }`}>
                              {novedad.estado === 'Crítico' ? <AlertCircle className="h-4 w-4" /> :
                               novedad.estado === 'Importante' ? <AlertTriangle className="h-4 w-4" /> :
                               novedad.estado === 'Completado' ? <CheckCircle2 className="h-4 w-4" /> :
                               <MessageSquare className="h-4 w-4" />}
                            </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-sm text-text-main truncate">{novedad.titulo}</h4>
                                <p className="text-[10px] text-slate-400 font-mono flex items-center mt-0.5">
                                  <History className="h-3 w-3 mr-1" />
                                  {new Date(novedad.created_at).toLocaleString([], { 
                                    day: '2-digit', 
                                    month: '2-digit', 
                                    year: 'numeric', 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </p>
                              </div>
                          </div>

                          {/* Columna 2: Comentario y Estado */}
                          <div className="flex flex-col md:flex-row justify-between gap-4 md:border-l md:border-slate-100 md:pl-6">
                            <p className="text-sm text-secondary leading-relaxed whitespace-pre-wrap flex-1">
                              {novedad.comentario}
                            </p>
                            <div className="flex-shrink-0 self-start">
                              <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full border ${
                                novedad.estado === 'Crítico' ? 'bg-red-50 text-red-700 border-red-100' :
                                novedad.estado === 'Importante' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                novedad.estado === 'Completado' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                'bg-slate-50 text-slate-700 border-slate-200'
                              }`}>
                                {novedad.estado}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Modal Nueva Novedad */}
            {showNovedadModal && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowNovedadModal(false)} />
                <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-muted/30 bg-white flex justify-between items-center">
                    <h3 className="text-lg font-bold text-text-main flex items-center">
                      <Plus className="h-5 w-5 text-primary mr-2" />
                      Registrar Novedad
                    </h3>
                    <button onClick={() => setShowNovedadModal(false)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                  <form onSubmit={handleSaveNovedad} className="p-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">Título de la Tarea/Novedad</label>
                        <input
                          required
                          type="text"
                          value={novedadForm.titulo}
                          onChange={(e) => setNovedadForm({ ...novedadForm, titulo: e.target.value })}
                          className="w-full rounded-lg border border-muted px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="Ej: Cambio en cronograma de grabación"
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">Estado / Gravedad</label>
                          <select
                            value={novedadForm.estado}
                            onChange={(e) => setNovedadForm({ ...novedadForm, estado: e.target.value as any })}
                            className="w-full rounded-lg border border-muted px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            <option value="Normal">Normal</option>
                            <option value="Importante">Importante</option>
                            <option value="Crítico">Crítico</option>
                            <option value="Completado">Completado</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1">Comentario detallado</label>
                        <textarea
                          required
                          rows={4}
                          value={novedadForm.comentario}
                          onChange={(e) => setNovedadForm({ ...novedadForm, comentario: e.target.value })}
                          className="w-full rounded-lg border border-muted px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="Describe lo ocurrido..."
                        />
                      </div>
                    </div>

                    <div className="mt-8 flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setShowNovedadModal(false)}
                        className="px-4 py-2 text-sm font-bold text-secondary border border-muted rounded-lg hover:bg-slate-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={submittingNovedad}
                        className="flex items-center px-6 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-50"
                      >
                        {submittingNovedad && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Guardar Novedad
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'calendario' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-muted/30 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  <span className="text-sm font-bold text-text-main uppercase tracking-wider">Fecha de Inicio de Construcción</span>
                </div>
                <div>
                  {user?.role === 'admin' ? (
                    <input 
                      type="date"
                      value={curso.fecha_inicio || ''}
                      onChange={(e) => handleUpdateFechaInicio(e.target.value)}
                      className="text-sm font-bold bg-slate-50 border border-muted rounded-lg px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-sm transition-all"
                    />
                  ) : (
                    <div className="text-sm font-bold text-text-main bg-slate-50 border border-slate-100 rounded-lg px-4 py-2">
                      {curso.fecha_inicio ? new Date(curso.fecha_inicio).toLocaleDateString() : 'No definida'}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-muted/30 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-primary" />
                  <span className="text-sm font-bold text-text-main uppercase tracking-wider">Duración (Días)</span>
                </div>
                <div>
                  {user?.role === 'admin' ? (
                    <select
                      value={curso.duracion || ''}
                      onChange={(e) => handleUpdateDuracion(e.target.value)}
                      className="text-sm font-bold bg-slate-50 border border-muted rounded-lg px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-sm transition-all"
                    >
                      <option value="">Seleccione</option>
                      <option value="30">30</option>
                      <option value="45">45</option>
                      <option value="60">60</option>
                      <option value="75">75</option>
                      <option value="90">90</option>
                      <option value="105">105</option>
                      <option value="120">120</option>
                    </select>
                  ) : (
                    <div className="text-sm font-bold text-text-main bg-slate-50 border border-slate-100 rounded-lg px-4 py-2">
                      {curso.duracion ? `${curso.duracion} días` : 'No definida'}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="bg-background rounded-xl shadow-sm border border-muted/30 p-6">
              <Calendario cursoId={curso.id} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
