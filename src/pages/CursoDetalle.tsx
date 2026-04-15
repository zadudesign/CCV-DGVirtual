import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getClickupUrlForRole } from '../lib/utils';
import { DynamicIcon } from '../components/DynamicIcon';
import { ArrowLeft, FileText, PenTool, Bell, Loader2, Lightbulb, Copy, Check, CalendarDays, LayoutDashboard } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, RadialBarChart, RadialBar, PolarAngleAxis, Legend } from 'recharts';
import Calendario from './Calendario';

export default function CursoDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [curso, setCurso] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'documentacion' | 'construccion' | 'novedades' | 'calendario'>('construccion');
  const [copiedId, setCopiedId] = useState(false);
  
  useEffect(() => {
    if (id) {
      fetchCurso();

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
            fetchCurso(false); // Actualizar sin mostrar el loader
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [id]);

  const fetchCurso = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const { data, error } = await supabase
        .from('cursos')
        .select(`
          *,
          docente:profiles!docente_id(name, email),
          evaluador:profiles!evaluador_id(name, email)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setCurso(data);
    } catch (err) {
      console.error('Error fetching curso:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
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
                </div>
              </div>

              {/* Ficha Técnica */}
              <div className={`mt-8 grid grid-cols-2 sm:grid-cols-3 gap-4 pt-6 border-t ${theme.border}`}>
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
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-muted/30">
        <nav className="-mb-px flex space-x-8">
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
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'documentacion' && (
          <div className="bg-white rounded-xl shadow-sm border border-muted/30 p-8 text-center flex flex-col items-center">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-main">Documentación del Curso</h3>
            <p className="text-secondary mt-2 max-w-md mx-auto mb-6">
              Aquí se alojarán los sílabos, guías didácticas, y recursos bibliográficos del curso.
            </p>
            {curso.drive_url ? (
              <a 
                href={curso.drive_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 bg-white border border-muted/30 text-text-main rounded-lg hover:bg-background hover:text-primary transition-colors shadow-sm font-medium"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                  <path d="m6.6 66.85 22.35 11.1c5.8 2.9 15.6 2.9 21.4 0l22.35-11.1c5.8-2.9 8.7-8.2 8.7-14.9V25.25c0-6.7-2.9-12-8.7-14.9L50.35-1.1c-5.8-2.9-15.6-2.9-21.4 0L6.6 10.35C.8 13.25-2.1 18.55-2.1 25.25v26.7c0 6.7 2.9 12 8.7 14.9z" fill="#000000" fillOpacity="0"/>
                  <path d="M43.65 25.25v26.7L20.5 65.3V38.6l23.15-13.35z" fill="#FFC107"/>
                  <path d="M43.65 25.25v26.7L66.8 65.3V38.6L43.65 25.25z" fill="#1976D2"/>
                  <path d="M20.5 12.7l23.15 13.35L66.8 12.7 43.65-.65 20.5 12.7z" fill="#4CAF50"/>
                </svg>
                Abrir Carpeta en Google Drive
              </a>
            ) : (
              <div className="inline-flex items-center px-6 py-3 bg-background border border-muted/30 text-slate-400 rounded-lg cursor-not-allowed font-medium">
                <svg className="w-5 h-5 mr-3 opacity-50 grayscale" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                  <path d="m6.6 66.85 22.35 11.1c5.8 2.9 15.6 2.9 21.4 0l22.35-11.1c5.8-2.9 8.7-8.2 8.7-14.9V25.25c0-6.7-2.9-12-8.7-14.9L50.35-1.1c-5.8-2.9-15.6-2.9-21.4 0L6.6 10.35C.8 13.25-2.1 18.55-2.1 25.25v26.7c0 6.7 2.9 12 8.7 14.9z" fill="#000000" fillOpacity="0"/>
                  <path d="M43.65 25.25v26.7L20.5 65.3V38.6l23.15-13.35z" fill="#FFC107"/>
                  <path d="M43.65 25.25v26.7L66.8 65.3V38.6L43.65 25.25z" fill="#1976D2"/>
                  <path d="M20.5 12.7l23.15 13.35L66.8 12.7 43.65-.65 20.5 12.7z" fill="#4CAF50"/>
                </svg>
                Carpeta de Drive no configurada
              </div>
            )}
          </div>
        )}

        {activeTab === 'novedades' && (
          <div className="bg-white rounded-xl shadow-sm border border-muted/30 p-8 text-center">
            <Bell className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-main">Novedades y Actualizaciones</h3>
            <p className="text-secondary mt-2 max-w-md mx-auto">
              Historial de cambios, notificaciones y comentarios sobre el progreso del curso.
            </p>
          </div>
        )}

        {activeTab === 'calendario' && (
          <div className="bg-background rounded-xl shadow-sm border border-muted/30 p-6">
            <Calendario cursoId={curso.id} />
          </div>
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
      </div>
    </div>
  );
}
